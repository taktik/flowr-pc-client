import { Transform, TransformCallback } from 'stream'
import { CircularBuffer } from '@taktik/buffers'
import { IStreamerConfig } from './interfaces/ipcStreamerConfig'

// TODO: Refactor with IpcStreamer to create an "IntervalStream" (with a better name)
export class FfmpegChunker extends Transform {
  private buffer: CircularBuffer
  private sendInterval: number | undefined
  private sendIntervalValue: number

  constructor({ capacity, maxCapacity, poolConfig, sendInterval }: IStreamerConfig) {
    super({ autoDestroy: true })
    this.buffer = new CircularBuffer({
      allowOverwrite: false,
      capacity,
      maxCapacity,
      poolConfig,
    })
    this.sendIntervalValue = sendInterval
  }

  // tslint:disable-next-line: function-name
  _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback) {
    try {
      try {
        this.buffer.write(chunk)
      } catch (e) {
        console.error('Could not write chunk to ffmpeg/ffprobe pipe:', e)
        this.attemptSend()

        try {
          this.buffer.write(chunk)
        } catch (e) {
          console.error('FfmpegChunker input chunk size is bigger than its capacity.')
          console.error('Consider increasing ffmpegChunker\'s maxCapacity and/or capacity')
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

  // tslint:disable-next-line: function-name
  _destroy(error: Error | null, cb: (error: Error | null) => void) {
    clearInterval(this.sendInterval)
    cb(null)
  }

  private attemptSend() {
    const availableRead = this.buffer.availableRead

    if (availableRead) {
      if (!this.send(this.buffer.read(availableRead))) {
        this.buffer.rewind(availableRead)
      }
    }
  }

  private send(buffer: Buffer): boolean {
    return this.push(buffer)
  }
}
