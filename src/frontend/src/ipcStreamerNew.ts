import { Readable, Writable } from 'stream'
import { WebContents } from 'electron'
import { CircularBuffer } from '@taktik/buffers'
import { IStreamerConfig } from './interfaces/ipcStreamerConfig'
import { FfmpegCommand } from 'fluent-ffmpeg'

export enum IpcStreamerMode {
  INSTANT,
  PERIODIC,
}

export class IpcStreamer extends Writable {
  private sender: WebContents | undefined
  private buffer: CircularBuffer
  private sendInterval: number | undefined
  private sendIntervalValue: number
  private currentInput: FfmpegCommand | Readable | undefined
  private currentMode: IpcStreamerMode | undefined

  currentAudioPid: number | undefined

  set nextInput(input: FfmpegCommand | Readable) {
    const handleFirstChunk = (chunk: Buffer) => {
      console.log('---------------- ON FIRST DATA ---------------')

      this.currentMode = input instanceof FfmpegCommand
        ? IpcStreamerMode.PERIODIC
        : IpcStreamerMode.INSTANT

      // Append first received chunk
      this.appendData(chunk)
      input.pipe(this)
      input.removeListener('data', handleFirstChunk)

      if (this.currentInput instanceof FfmpegCommand) {
        console.log('---------------- KILLING PREVIOUS FFMPEG COMMAND ---------------')
        this.currentInput.kill('SIGTERM')
      } else if (this.currentInput instanceof Readable) {
        console.log('---------------- UNPIPING PREVIOUS READABLE ---------------')
        this.currentInput.unpipe(this)
      }

      this.currentInput = input
      console.log('---------------- SET NEW INPUT ---------------')
    }
    input.addListener('data', handleFirstChunk)
  }

  constructor({ capacity, maxCapacity, readMode, sendInterval }: IStreamerConfig) {
    super({ autoDestroy: false })
    this.buffer = new CircularBuffer({
      allowOverwrite: false,
      capacity,
      maxCapacity,
      readMode,
    })
    this.sendIntervalValue = sendInterval
  }

  appendData(chunk: Buffer): void {
    try {
      this.buffer.write(chunk)
    } catch (e) {
      console.error('Could not write chunk to streamer buffer:', e)
      this.attemptSend()

      try {
        this.buffer.write(chunk)
      } catch (e) {
        console.error('Output chunk\'s size is bigger than streamer\'s capacity.')
        console.error('Consider increasing streamer\'s maxCapacity and/or capacity')
        console.error(e)
        this.send(chunk)
      }
    }

    switch (this.currentMode) {
      case IpcStreamerMode.INSTANT:
        clearInterval(this.sendInterval)
        this.attemptSend()
        break
      case IpcStreamerMode.PERIODIC:
        if (!this.sendInterval) {
          this.sendInterval = setInterval(this.attemptSend.bind(this), this.sendIntervalValue)
        }
        break
    }
  }

  // tslint:disable-next-line: function-name
  _write(chunk: Buffer, encoding: BufferEncoding, callback: (error: Error | null | undefined) => void) {
    try {
      this.appendData(chunk)
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
    this.buffer.clear()
    this.sendInterval = undefined
    this.sender = undefined
    this.removeAllListeners()
  }

  // tslint:disable-next-line: function-name
  _final(cb: (error?: Error) => void) {
    this.clear()
    cb()
  }

  private attemptSend() {
    if (this.buffer.availableRead) {
      this.send(this.buffer.readAll())
    }
  }

  private send(data: Buffer) {
    if (this.sender) {
      this.sender.send('segment', { type: 'ffmpeg', pid: this.currentAudioPid, data })
    } else {
      console.error('No sender defined, cannot send segment')
    }
  }
}
