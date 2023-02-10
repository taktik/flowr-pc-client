import { CircularBuffer } from '@taktik/buffers'
import { Transform, TransformCallback } from 'stream'
import { IStreamerConfig } from '../../interfaces/ipcStreamerConfig'
import { ILogger } from '../../logging/loggers'
import { OutputParserResponse } from './types'

/**
 * Ffmpeg outputs can be handled differently depending on the used container format
 * For example, we know how to structure mp4 chunks for them to be well handled by a MediaSource
 * This transform stream is used as a buffer to structure this data and send it when we deem it readable
 */
abstract class FfmpegParser extends Transform {
  private _buffer: CircularBuffer

  protected abstract log: ILogger

  constructor({ capacity, maxCapacity, readMode }: IStreamerConfig) {
    super({ readableObjectMode: true })

    this._buffer = new CircularBuffer({
      allowOverwrite: false,
      capacity,
      maxCapacity,
      readMode,
    })
  }

  /**
   * Format buffered data to a structure usable by a MediaSource
   * @param {Buffer} bufferedData 
   * @returns {OutputParserResponse} an optional init segment, and stream data
   */
  protected formatOutput(bufferedData: Buffer): OutputParserResponse {
    return { data: bufferedData }
  }

  /**
   * Read from buffer and push data to the next stream
   */
  protected attemptSend(): void {
    const toRead = this._buffer.availableRead

    if (toRead) {
      if (!this.push(this.formatOutput(this._buffer.read(toRead)))) {
        this._buffer.rewind(toRead)
      }
    }
  }

  /**
   * Handle incoming data, optionnaly parse and reformat it
   * Base implementation, aims to be overridden
   * @param {Buffer} chunk Data to process
   * @returns Data to be added to the inner buffer
   */
  protected preBufferProcess(chunk: Buffer): Buffer {
    return chunk
  }

  /**
   * Append data to the inner buffer
   * If data fails to be appended, attempt to free some data
   * If append still fails, directly send it
   * @param {Buffer} chunk Data to add to the buffer
   */
  protected buffer(chunk: Buffer): void {
    try {
      this._buffer.write(chunk)
    } catch (e) {
      this.log.warn('Could not write chunk to streamer buffer:', e)
      this.attemptSend()

      try {
        this._buffer.write(chunk)
      } catch (error) {
        this.log.error('Output chunk size is bigger than streamer\'s capacity. Consider increasing streamer\'s maxCapacity and/or capacity', error)
        this.write(chunk)
      }
    }
  }

  /**
   * Start any action after data has been added to the buffer
   * Base implementation, aims to be overridden
   */
  protected postBufferProcess(): void {
    // Empty base implementation
  }

  _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    try {
      const data = this.preBufferProcess(chunk)

      this.buffer(data)

      this.postBufferProcess()
      callback(null)
    } catch (error) {
      callback(error)
    }
  }

  clear(flush = false): void {
    if (flush) {
      this.attemptSend()
    }
    this._buffer.clear()
    this.removeAllListeners()
    this.log.debug('Cleared')
  }
}

export default FfmpegParser
