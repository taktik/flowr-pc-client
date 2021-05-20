import { Duplex, PassThrough, Readable } from 'stream'
import { FlowrFfmpeg } from '../ffmpeg'
import { IpcStreamer } from '../ipcStreamer'
import { Store } from '../store'
import { IPlayerStore } from '../interfaces/playerStore'
import { WebContents } from 'electron'
import { PlayerError, PlayerErrors } from '../playerError'
import { FfmpegCommand } from 'fluent-ffmpeg'
import { Dispatcher } from '../dispatcher'
import { IPipelineTail } from '../interfaces/playerPipeline'
import { TrackInfo, TrackInfoStream } from '@taktik/mux.js'

// TODO: Error management policy (how many retries before giving up, which errors to throw, etc...)
// TODO: Forward logs to flowr-frontend

type CurrentStream = { input: Readable, audioPid: number, subtitlesPid: number, command: FfmpegCommand }

class FfmpegWrapper implements IPipelineTail {
  private flowrFfmpeg: FlowrFfmpeg = new FlowrFfmpeg()
  private streamer: IpcStreamer
  private dispatcher = new Dispatcher()
  private _currentStream?: CurrentStream
  private metadataProcess?: { input: Duplex, stream: TrackInfoStream, dataCb: (trackInfo: TrackInfo) => void, errorCb: (e: Error) => void }

  private set currentStream(currentStream: CurrentStream | undefined) {
    this._currentStream = currentStream
    this.streamer.currentAudioPid = currentStream?.audioPid
  }
  private get currentStream(): CurrentStream | undefined {
    return this._currentStream
  }

  set sender(sender: WebContents) {
    this.streamer.sender = sender
  }

  constructor(store: Store<IPlayerStore>) {
    this.streamer = new IpcStreamer(store.get('streamer'))
  }

  playTimeout?: number // TODO: implement timeout before playing again in some cases

  play(input: Readable, baseAudioPid?: number, subtitlesPid?: number): void {
    clearTimeout(this.playTimeout)
    input.pipe(this.dispatcher)

    this.retrieveMetadata() // TODO: store this adapting to previous format
      .then((trackInfo: TrackInfo) => {
        const audioPid = baseAudioPid ?? trackInfo.audio.reduce((min, audio) => Math.min(min, audio.pid), 99999)
        const ffmpegInput = this.dispatcher.pipe(new PassThrough({ autoDestroy: false }))
        const command = trackInfo.video
          ? this.flowrFfmpeg.getVideoPipelineWithSubtitles({ input: ffmpegInput, audioPid, subtitlesPid, errorHandler: this.getErrorHandler() })
          : this.flowrFfmpeg.getAudioMpegtsPipeline(input, this.getErrorHandler())

        this.currentStream = { input, audioPid, subtitlesPid, command }
        command.pipe(this.streamer, { end: false })
      })
      .catch(e => {
        // TODO: handle this error. replay after a few milliseconds ?
        console.error('PLAY ERROR', e)
      })
  }

  replay(): void {
    if (!this._currentStream) {
      return
    }
    console.log('ATTEMPT REPLAY !!')
    const { input, audioPid, subtitlesPid } = this.currentStream
    this.clear()
    this.play(input, audioPid, subtitlesPid)
  }

  clear() {
    clearTimeout(this.playTimeout)
    this.killMetadataProcess()
    this.currentStream?.command.kill('SIGTERM')
    this.currentStream?.input.unpipe(this.dispatcher)
    this.dispatcher.clear()
    this.streamer.clear()
    this.currentStream = undefined
  }

  async handleErroneousStreamError() {
    if (this.currentStream) {
      // reset to default audio and subtitles and try again
      this.currentStream.audioPid = undefined
      this.currentStream.subtitlesPid = undefined
      this.replay()
    }
  }

  getErrorHandler() {
    return (error: PlayerError) => {
      switch (error.code) {
        case PlayerErrors.ERRONEOUS_STREAM:
          this.handleErroneousStreamError()
          break
        case PlayerErrors.TERMINATED:
          // silence this, most probably we terminated the process on purpose
          break
        case PlayerErrors.CONVERSION:
        default:
          console.error('Player error', error)
          this.replay()
      }
    }
  }

  killMetadataProcess(): void {
    if (this.metadataProcess) {
      const { input, stream, dataCb, errorCb } = this.metadataProcess

      this.dispatcher.unpipe(input)
      stream.off('data', dataCb)
      stream.off('error', errorCb)
      input.destroy()
      stream.destroy()

      this.metadataProcess = undefined
    }
  }

  retrieveMetadata(): Promise<TrackInfo> {
    return new Promise((resolve, reject) => {
      const input = this.dispatcher.pipe(new PassThrough({ autoDestroy: false }))
      const stream = new TrackInfoStream()
      input.pipe(stream)

      const dataCb = (trackInfo: TrackInfo) => {
        this.streamer.sendTrackInfo(trackInfo)
        resolve(trackInfo)
        this.killMetadataProcess()
      }

      const errorCb = (e: Error) => {
        reject(e)
        this.killMetadataProcess()
      }

      stream.on('data', dataCb)
      stream.on('error', errorCb)

      this.metadataProcess = { input, stream, dataCb, errorCb }
    })
  }

  setAudioTrackFromPid(pid: number): void {
    const { input, audioPid, subtitlesPid } = this.currentStream

    if (pid !== audioPid) {
      this.clear()
      this.play(input, pid, subtitlesPid)
    }
  }

  setSubtitlesFromPid(pid: number | undefined) {
    const { input, audioPid, subtitlesPid } = this.currentStream

    if (pid !== subtitlesPid) {
      this.clear()
      this.play(input, audioPid, pid)
    }
  }
}

export { FfmpegWrapper }
