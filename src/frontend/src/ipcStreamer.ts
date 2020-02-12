import { Writable } from 'stream'
import { WebContents, IpcMainEvent } from 'electron'
import { CircularBuffer } from '@taktik/buffers'
import { IStreamerConfig } from './interfaces/ipcStreamerConfig'

export class IpcStreamer extends Writable {
  private readonly sender: WebContents
  private buffer: CircularBuffer
  private sendInterval: number | undefined
  private sendIntervalValue: number
  /**
   * @deprecated: This property should be handled on Flowr side
   */
  private isFirstChunk: boolean = true

  constructor(event: IpcMainEvent, { capacity, maxCapacity, poolConfig, sendInterval }: IStreamerConfig) {
    super({ autoDestroy: false })
    this.sender = event.sender
    this.buffer = new CircularBuffer({
      allowOverwrite: false,
      capacity,
      maxCapacity,
      poolConfig,
    })
    this.sendIntervalValue = sendInterval
  }

  // tslint:disable-next-line: function-name
  _write(chunk: Buffer, encoding: BufferEncoding, callback?: (error: Error | null | undefined) => void) {
    try {
      try {
        this.buffer.write(chunk)
      } catch (e) {
        console.error('Could not write chunk to streamer buffer:', e)
        this.attemptSend()

        try {
          this.buffer.write(chunk)
        } catch (e) {
          console.error('Ffmpeg output chunk size is bigger than streamer\'s capacity.')
          console.error('Consider increasing streamer\'s maxCapacity and/or capacity')
          console.error(e)
          this.send(chunk)
        }
      }
      if (!this.sendInterval) {
        this.sendInterval = setInterval(this.attemptSend.bind(this), this.sendIntervalValue)
      }
      callback(null)
    } catch (e) {
      callback(e)
    }
  }

  flush() {
    this.attemptSend()
  }

  // tslint:disable-next-line: function-name
  _final(cb: (error?: Error) => void) {
    clearInterval(this.sendInterval)
    cb()
  }

  private attemptSend() {
    if (this.buffer.availableRead) {
      this.send(this.buffer.readAll())
    }
  }

  private send(buffer: Buffer) {
    this.sender.send('segment', { buffer, isFirst: this.isFirstChunk })
    this.isFirstChunk = false
  }
}
