import { Writable } from 'stream'
import { WebContents, IpcMainEvent } from 'electron'

export class IpcStreamer extends Writable {
  private readonly sender: WebContents
  /**
   * @deprecated: This property should be handled on Flowr side
   */
  private isFirstChunk: boolean = true

  constructor(event: IpcMainEvent) {
    super({ autoDestroy: false })
    this.sender = event.sender
  }

  // tslint:disable-next-line: function-name
  _write(buffer: Buffer, encoding: BufferEncoding, callback?: (error: Error | null | undefined) => void) {
    try {
      this.sender.send('segment', { buffer, isFirst: this.isFirstChunk })
      callback(null)
    } catch (e) {
      callback(e)
    } finally {
      this.isFirstChunk = false
    }
  }
}
