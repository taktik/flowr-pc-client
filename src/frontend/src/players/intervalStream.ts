import { CircularBuffer } from '@taktik/buffers'
import { Transform, TransformCallback } from 'stream'
import { IStreamerConfig } from './interfaces/ipcStreamerConfig'

export class IntervalStream extends Transform {
  private buffer: CircularBuffer
  private sendInterval: number | undefined
  private sendIntervalValue: number

  private attemptSend() {
    if (this.buffer.availableRead) {
      this.push(this.buffer.readAll())
    }
  }

  constructor({ capacity, maxCapacity, readMode, sendInterval }: IStreamerConfig) {
    super({ autoDestroy: false })
    this.buffer = new CircularBuffer({
      allowOverwrite: false,
      capacity,
      maxCapacity,
      readMode,
    })
    this.sendIntervalValue = Math.max(sendInterval || 2000, 1000) // do not consider 0 as valid, and do not go below 1s
  }

  // tslint:disable-next-line: function-name
  _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback) {
    try {
      try {
        this.buffer.write(chunk)
      } catch (e) {
        console.error('[IntervalStream] Could not write chunk to buffer:', e)
        this.attemptSend()

        try {
          this.buffer.write(chunk)
        } catch (e) {
          console.error(`[IntervalStream] Output chunk size (${chunk.byteLength}) is bigger than streamer\'s capacity (${this.buffer.capacity}).`)
          console.error('[IntervalStream] Consider increasing streamer\'s maxCapacity and/or capacity')
          console.error('[IntervalStream]', e)
          this.push(chunk)
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

  clear(flush: boolean = false) {
    if (flush) {
      this.attemptSend()
    }
    clearInterval(this.sendInterval)
    this.buffer?.clear()
    this.sendInterval = undefined
  }

  // tslint:disable-next-line: function-name
  _final(callback: (error?: Error) => void) {
    try {
      this.clear()
      callback()
    } catch (e) {
      callback(e)
    }
  }
}
