import { IOutputTrack, TrackInfo } from '@taktik/mux.js'
import { Writable } from 'stream'
import { WebContents } from 'electron'
import { getLogger } from '../logging/loggers'
import { OutputParserResponse } from './parsers/types'

export class IpcStreamer extends Writable {
  private _sender: WebContents | undefined
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

  sendTrackInfo(trackInfo: TrackInfo): void {
    this.currentTrackInfo = trackInfo
    this.send('trackinfo', trackInfo)
  }
}
