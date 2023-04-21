import { IOutputTrack, TrackInfo } from '@taktik/mux.js'
import { Writable } from 'stream'
import { WebContents } from 'electron'
import { getLogger } from '../logging/loggers'
import { OutputParserResponse } from './parsers/types'

export class IpcStreamer extends Writable {
  private _sender: WebContents | undefined
  private sendInterval?: NodeJS.Timeout
  private sendIntervalValue: number
  private log = getLogger('Ipc streamer')

  currentAudioPid: number | undefined
  currentTrackInfo: TrackInfo | undefined
  currentCodec = 'avc1.64001f, mp4a.40.5' // default codec: custom chromium always goes through ffmepg anyway

  set sender(sender: WebContents | undefined) {
    this._sender = sender
  }

  constructor() {
    super({ autoDestroy: false, objectMode: true })
  }

  private formatOutput({ initSegment, data }: OutputParserResponse): IOutputTrack<'audio' | 'video'> {
    const type = !this.currentTrackInfo?.video ? 'audio' : 'video' // default to video
    const pid = this.currentAudioPid || 0

    return {
      data,
      type,
      initSegment,
      codec: this.currentCodec,
      pid,
    }
  }

  private send(message: string, content: any) {
    if (this._sender) {
      this._sender.send(message, content)
    } else {
      this.log.warn(`No sender defined, cannot send "${message}" message`)
    }
  }

  private sendSegment(data: OutputParserResponse) {
    const formatted = this.formatOutput(data)

    this.send('segment', formatted)
  }

  paused = false

  private startSendInterval() {
    if (!this.sendInterval && !this.paused) {
      this.sendInterval = setInterval(this.attemptSend.bind(this), this.sendIntervalValue)
    }
  }

  // tslint:disable-next-line: function-name
  _write(segment: OutputParserResponse, encoding: BufferEncoding, callback: (error: Error | null | undefined) => void): void {
    try {
      this.sendSegment(segment)
      callback(null)
    } catch (e) {
      callback(e)
    }
  }

  clear(): void {-
    this.removeAllListeners()
    this.currentTrackInfo = undefined
    this.log.debug('Cleared')
  }

  // tslint:disable-next-line: function-name
  _final(cb: (error?: Error) => void): void {
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
    if (this.buffer.availableRead && !this.paused) {
      this.sendSegment(this.buffer.readAll())
    }
  }

  private send(message: string, content: any) {
    if (this._sender) {
      this._sender.send(message, content)
    } else {
      this.log.error(`No sender defined, cannot send "${message}" message`)
    }
  }

  private sendSegment(segment: Buffer) {
    const data = this.formatFfmpegOutput(segment)
    this.send('segment', data)
  }

  sendTrackInfo(trackInfo: TrackInfo): void {
    this.currentTrackInfo = trackInfo
    this.send('trackinfo', trackInfo)
  }

  pause(): void {
    this.paused = true
    clearInterval(this.sendInterval)
    this.sendInterval = undefined
  }

  resume(): void {
    this.paused = false
    this.startSendInterval()
  }
}
