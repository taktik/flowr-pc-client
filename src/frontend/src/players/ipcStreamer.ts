import { CircularBuffer } from '@taktik/buffers'
import { IOutputTrack, TrackInfo } from '@taktik/mux.js'
import { Writable } from 'stream'
import { WebContents } from 'electron'
import { IStreamerConfig } from './interfaces/ipcStreamerConfig'

export class IpcStreamer extends Writable {
  private _sender: WebContents | undefined
  private buffer: CircularBuffer
  private sendInterval: number | undefined
  private sendIntervalValue: number

  currentAudioPid: number | undefined
  currentTrackInfo: TrackInfo | undefined
  currentCodec = 'avc1.64001f, mp4a.40.5' // default codec: custom chromium always goes through ffmepg anyway

  set sender(sender: WebContents | undefined) {
    this._sender = sender
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

  // tslint:disable-next-line: function-name
  _write(chunk: Buffer, encoding: BufferEncoding, callback: (error: Error | null | undefined) => void) {
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
          this.sendSegment(chunk)
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
    this.buffer.clear()
    this.sendInterval = undefined
    this.removeAllListeners()
    this.currentTrackInfo = undefined
  }

  // tslint:disable-next-line: function-name
  _final(cb: (error?: Error) => void) {
    this.clear()
    cb()
  }

  private formatFfmpegOutput(data: Buffer): IOutputTrack<'audio' | 'video'> {
    const type = !this.currentTrackInfo?.video ? 'audio' : 'video' // default to video if we did not
    const pid = this.currentAudioPid || 0

    return {
      data,
      type,
      codec: this.currentCodec,
      pid,
    }
  }

  private attemptSend() {
    if (this.buffer.availableRead) {
      this.sendSegment(this.buffer.readAll())
    }
  }

  private send(message: string, content: any) {
    if (this._sender) {
      this._sender.send(message, content)
    } else {
      console.error(`No sender defined, cannot send "${message}" message`)
    }
  }

  private sendSegment(segment: Buffer) {
    const data = this.formatFfmpegOutput(segment)
    this.send('segment', data)
  }

  sendTrackInfo(trackInfo: TrackInfo) {
    this.currentTrackInfo = trackInfo
    this.send('trackinfo', trackInfo)
  }
}
