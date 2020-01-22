import { Writable } from 'stream'
import { WebContents, IpcMainEvent } from 'electron'
import { CircularBuffer } from '@taktik/buffers'
import { IIpcStreamerConfig } from './interfaces/ipcStreamerConfig'

export class IpcStreamer extends Writable {
  private readonly sender: WebContents
  private buffer: CircularBuffer
  /**
   * @deprecated: This property should be handled on Flowr side
   */
  private isFirstChunk: boolean = true

  constructor(event: IpcMainEvent, { chunkSize, poolConfig }: IIpcStreamerConfig) {
    super({ autoDestroy: false })
    this.sender = event.sender
    this.buffer = new CircularBuffer({
      poolConfig,
      allowOverwrite: false,
      capacity: chunkSize,
    })
  }

  // tslint:disable-next-line: function-name
  _write(chunk: Buffer, encoding: BufferEncoding, callback?: (error: Error | null | undefined) => void) {
    try {
      if (this.buffer.availableWrite < chunk.length) {
        const buffer = this.buffer.readAll()
        this.sender.send('segment', { buffer, isFirst: this.isFirstChunk })
        this.isFirstChunk = false
      }
      this.buffer.write(chunk)
      callback(null)
    } catch (e) {
      callback(e)
    }
  }
}
