import { Writable } from 'stream'
import { WebContents, IpcMainEvent } from 'electron'
import { CircularBuffer } from '@taktik/buffers'
import { IIpcStreamerConfig } from './interfaces/ipcStreamerConfig'

export class IpcStreamer extends Writable {
  readonly approxChunkSize: number
  private readonly sender: WebContents
  private buffer: CircularBuffer
  /**
   * @deprecated: This property should be handled on Flowr side
   */
  private isFirstChunk: boolean = true

  constructor(event: IpcMainEvent, { chunkSize, poolConfig }: IIpcStreamerConfig) {
    super({ autoDestroy: false })
    this.approxChunkSize = chunkSize
    this.sender = event.sender
    this.buffer = new CircularBuffer({
      poolConfig,
      allowOverwrite: false,
      capacity: chunkSize,
      maxCapacity: 20 * chunkSize,
    })
  }

  // tslint:disable-next-line: function-name
  _write(chunk: Buffer, encoding: BufferEncoding, callback?: (error: Error | null | undefined) => void) {
    try {
      this.buffer.write(chunk)

      if (this.buffer.availableRead >= this.approxChunkSize) {
        const buffer = this.buffer.readAll()
        this.sender.send('segment', { buffer, isFirst: this.isFirstChunk })
        this.isFirstChunk = false
      }
      callback(null)
    } catch (e) {
      callback(e)
    }
  }
}
