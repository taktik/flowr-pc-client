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
      allowOverwrite: false,
      capacity: chunkSize,
      poolConfig,
    })
  }

  // tslint:disable-next-line: function-name
  _write(chunk: Buffer, encoding: BufferEncoding, callback?: (error: Error | null | undefined) => void) {
    try {
      if (this.buffer.availableRead && this.buffer.availableWrite < chunk.length) {
        this.send(this.buffer.readAll())
      }

      // /!\ do not put this "if" as previous "if"'s "else" statement
      // availableWrite is a getter, and could have been updated by the "readAll" instruction
      if (this.buffer.availableWrite >= chunk.length) {
        this.buffer.write(chunk)
      } else {
        console.error('Ffmpeg output chunk size is bigger than streamer\'s chunkSize, the latter should be increased.')
        this.send(chunk)
      }
      callback(null)
    } catch (e) {
      callback(e)
    }
  }

  flush() {
    if (this.buffer.availableRead) {
      this.send(this.buffer.readAll())
    }
  }

  private send(buffer: Buffer) {
    this.sender.send('segment', { buffer, isFirst: this.isFirstChunk })
    this.isFirstChunk = false
  }
}
