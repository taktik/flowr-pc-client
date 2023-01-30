import { CircularBuffer } from '@taktik/buffers'
import { IOutputTrack, TrackInfo, mp4 } from '@taktik/mux.js'
import { Writable } from 'stream'
import { ipcMain, IpcMainEvent, WebContents } from 'electron'
import { IStreamerConfig } from '../interfaces/ipcStreamerConfig'
import { getLogger } from '../logging/loggers'
import { FileHandle, open } from 'fs/promises'

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

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    this.startRecord = this.startRecord.bind(this)
    this.stopRecord = this.stopRecord.bind(this)
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */

    /* eslint-disable @typescript-eslint/no-misused-promises, @typescript-eslint/unbound-method */
    ipcMain.on('record:start', this.startRecord)
    ipcMain.on('record:stop', this.stopRecord)
    /* eslint-enable @typescript-eslint/no-misused-promises, @typescript-eslint/unbound-method */
  }

  private recordHandle?: FileHandle

  private async startRecord(_: IpcMainEvent, folder?: string) {
    try {
      const handle = await open(`${folder ?? '/home/taktik'}/record-${Date.now()}.mp4`, 'w')
      
      if (this.initSegmentComplete && this.initSegment) {
        await handle.write(this.initSegment)
      }
  
      this.recordHandle = handle
    } catch (error) {
      this.log.warn('Failed to start recording', error)
    }
  }

  private async stopRecord() {
    await this.recordHandle?.close()
    this.recordHandle = undefined
  }

  private appendToInitSegment(chunk: Buffer): void {
    this.initSegment = this.initSegment ? Buffer.concat([this.initSegment, chunk]) : chunk
  }

  // tslint:disable-next-line: function-name
  _write(chunk: Buffer, encoding: BufferEncoding, callback: (error: Error | null | undefined) => void): void {
    try {
      let chunkToBuffer = chunk

      try {
        const [moof] = mp4.tools.findBox(chunk, ['moof'])

        if (!this.initSegmentComplete && moof) {
          this.initSegmentComplete = true

          const index = chunk.indexOf(moof)
          /**
           * The call to "mp4.tools.findBox" returns the requested boxes content if found, without their header
           * The header is composed of 8 bytes: 4 bytes for the boxe's size + 4 bytes for its type (e.g moof, mdat, ftyp, etc...)
           * Thus the "index - 8" below: we want to retrieve the index of the beginning of the whole box, headers included
           */
          const indexBeforeHeaders = index - 8

          if (indexBeforeHeaders < 0) {
            this.log.warn('Something is wrong, we detected the first moof box but there is not enough room for its headers ?!')
          } else if (indexBeforeHeaders > 0) {
            this.log.info(`------------------ Found first moof at index ${indexBeforeHeaders} ------------------`)
            // moof detected in the middle of the chunk: we need to complete the init segment with the bytes before it
            this.appendToInitSegment(chunk.slice(0, indexBeforeHeaders))
            chunkToBuffer = chunk.slice(indexBeforeHeaders)
          } else {
            // moof is at the start of the package, no need to do anything else
          }
        }

        if (!this.initSegmentComplete) {
          this.log.debug('Completing init segment')
          this.appendToInitSegment(chunk)
        } else {
          if (moof) {
            this.attemptSend()
          }
          this.buffer.write(chunkToBuffer)
        }
      } catch (e) {
        this.log.error('Could not write chunk to streamer buffer:', e)
        this.attemptSend()

        try {
          this.buffer.write(chunkToBuffer)
        } catch (error) {
          this.log.error('Ffmpeg output chunk size is bigger than streamer\'s capacity. Consider increasing streamer\'s maxCapacity and/or capacity', error)
          this.sendSegment(chunkToBuffer)
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

    this.stopRecord().catch(e => this.log.warn('Failed to stop recording on "clear"', e))
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
    this.recordHandle?.write(data.data)
      .catch((e) => this.log.warn('Failed to write segment to record', e))
  }

  sendTrackInfo(trackInfo: TrackInfo): void {
    this.currentTrackInfo = trackInfo
    this.send('trackinfo', trackInfo)
  }
}
