import { CircularBuffer } from '@taktik/buffers'
import { IOutputTrack, TrackInfo, mp4 } from '@taktik/mux.js'
import { Writable } from 'stream'
import { WebContents } from 'electron'
import { IStreamerConfig } from '../interfaces/ipcStreamerConfig'
import { getLogger } from '../logging/loggers'

export class IpcStreamer extends Writable {
  private _sender: WebContents | undefined
  private buffer: CircularBuffer
  private sendInterval: number | undefined
  private log = getLogger('Ipc streamer')

  private initSegment?: Buffer
  private initSegmentComplete = false

  currentAudioPid: number | undefined
  currentTrackInfo: TrackInfo | undefined
  currentCodec = 'avc1.64001f, mp4a.40.5' // default codec: custom chromium always goes through ffmepg anyway

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

  private appendToInitSegment(chunk: Buffer): void {
    this.initSegment = this.initSegment ? Buffer.concat([this.initSegment, chunk]) : chunk
  }

  // tslint:disable-next-line: function-name
  _write(chunk: Buffer, encoding: BufferEncoding, callback: (error: Error | null | undefined) => void): void {
    try {
      let chunkWithMoof = chunk

      try {
        // Attempt to find a "moof" box in the chunk
        // if it is found, it means we reached the end of the previous box's data
        const [moof] = mp4.tools.findBox(chunk, ['moof'])

        if (!this.initSegmentComplete && moof) {
          // receiving a "moof" means that the initialization segment is complete
          this.initSegmentComplete = true

          /**
           * The call to "findBox" above returns the requested boxes' content if found, without their header
           * The header is composed of 8 bytes: 4 bytes for the boxe's size (in bytes) + 4 bytes for its type (e.g moof, mdat, ftyp, etc...)
           * Thus the "index - 8" below: we want to retrieve the index of the beginning of the whole box, headers included
           */
          const indexBeforeHeaders = chunk.indexOf(moof) - 8

          if (indexBeforeHeaders < 0) {
            this.log.warn('Something is wrong, we detected the first moof box but there is not enough room for its headers ?!')
          } else if (indexBeforeHeaders > 0) {
            this.log.info(`Found first moof at index ${indexBeforeHeaders} in the chunk. Attempt to complete init segment.`)
            this.appendToInitSegment(chunk.slice(0, indexBeforeHeaders))
            chunkWithMoof = chunk.slice(indexBeforeHeaders)
          } else {
            // "moof" is at the start of the package, no need to do anything else
          }
        }

        if (!this.initSegmentComplete) {
          this.log.debug('Completing init segment')
          this.appendToInitSegment(chunk)
        } else {
          if (moof) {
            // It's OK if the "moof" box is not exactly at the beginning of appended chunks. What matters is that it is contained in it.
            this.attemptSend()
          }
          this.buffer.write(chunkWithMoof)
        }
      } catch (e) {
        this.log.error('Could not write chunk to streamer buffer:', e)
        this.attemptSend()

        try {
          this.buffer.write(chunkWithMoof)
        } catch (error) {
          this.log.error('Ffmpeg output chunk size is bigger than streamer\'s capacity. Consider increasing streamer\'s maxCapacity and/or capacity', error)
          this.sendSegment(chunkWithMoof)
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
    this.initSegmentComplete = false
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
