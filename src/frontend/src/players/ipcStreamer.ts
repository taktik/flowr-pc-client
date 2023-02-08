import { CircularBuffer } from '@taktik/buffers'
import { IOutputTrack, TrackInfo } from '@taktik/mux.js'
import { Writable } from 'stream'
import { WebContents } from 'electron'
import { IStreamerConfig } from '../interfaces/ipcStreamerConfig'
import { getLogger } from '../logging/loggers'
import { IOutputParser } from './parsers/types'
import SimpleParser from './parsers/simple'

export class IpcStreamer extends Writable {
  private _sender: WebContents | undefined
  private buffer: CircularBuffer
  private sendInterval: number | undefined
  private log = getLogger('Ipc streamer')
  private initSegment?: Buffer

  currentAudioPid: number | undefined
  currentTrackInfo: TrackInfo | undefined
  currentCodec = 'avc1.64001f, mp4a.40.5' // default codec: custom chromium always goes through ffmepg anyway
  outputParser: IOutputParser = new SimpleParser()

  set sender(sender: WebContents | undefined) {
    this._sender = sender
  }

  constructor({ capacity, maxCapacity, readMode }: IStreamerConfig) {
    super({ autoDestroy: false })
    this.buffer = new CircularBuffer({
      allowOverwrite: false,
      capacity,
      maxCapacity,
      readMode,
    })
  }

  // tslint:disable-next-line: function-name
  _write(chunk: Buffer, encoding: BufferEncoding, callback: (error: Error | null | undefined) => void): void {
    try {
      const { initSegment, data, canSend } = this.outputParser.parse(chunk)
      
      this.initSegment = initSegment

      if (canSend) {
        this.attemptSend()
      }

      try {
        this.buffer.write(data)
      } catch (e) {
        this.log.warn('Could not write chunk to streamer buffer:', e)
        this.attemptSend()

        try {
          this.buffer.write(data)
        } catch (error) {
          this.log.error('Output chunk size is bigger than streamer\'s capacity. Consider increasing streamer\'s maxCapacity and/or capacity', error)
          this.sendSegment(data)
        }
      }
      callback(null)
    } catch (e) {
      callback(e)
    }
  }

  clear(flush = false): void {
    if (flush) {
      this.attemptSend()
    }
    clearInterval(this.sendInterval)
    this.buffer.clear()
    this.sendInterval = undefined
    this.removeAllListeners()
    this.currentTrackInfo = undefined
    this.initSegment = undefined
    this.log.debug('Cleared')
  }

  // tslint:disable-next-line: function-name
  _final(cb: (error?: Error) => void): void {
    this.clear()
    cb()
  }

  private formatFfmpegOutput(data: Buffer): IOutputTrack<'audio' | 'video'> {
    const type = !this.currentTrackInfo?.video ? 'audio' : 'video' // default to video
    const pid = this.currentAudioPid || 0

    return {
      data,
      type,
      initSegment: this.initSegment,
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
}
