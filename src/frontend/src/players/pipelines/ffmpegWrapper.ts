import { Readable } from 'stream'
import { IpcStreamer } from '../ipcStreamer'
import { Store } from '../../store'
import { IPlayerStore } from '../../interfaces/playerStore'
import { WebContents } from 'electron'
import { PlayerError, PlayerErrors } from '../playerError'
import { IPipelineTail } from '../../interfaces/playerPipeline'
import { getLogger } from '../../logging/loggers'
import { PlayingPipeline, PlayingPipelineProps, PlayingPipelineStates } from './ffmpegPlayingPipeline'

class FfmpegWrapper implements IPipelineTail {
  private id = `${Date.now()}-${Math.floor(1000 * Math.random())}`
  private logger = getLogger(`FfmpegWrapper [${this.id}]`)
  private streamer: IpcStreamer
  private currentPipeline?: PlayingPipeline
  private playTimeout?: number

  set sender(sender: WebContents) {
    this.streamer.sender = sender
  }

  constructor(store: Store<IPlayerStore>) {
    this.streamer = new IpcStreamer(store.get('streamer'))
  }

  initPipeline(pipeline: PlayingPipeline): void {
    pipeline.onEnterState(PlayingPipelineStates.ERROR, () => {
      const error = pipeline.lastError

      if (error instanceof PlayerError) {
        switch (error.code) {
          case PlayerErrors.ERRONEOUS_STREAM:
            this.handleErroneousStreamError()
            break
          case PlayerErrors.CONVERSION:
          default:
            this.logger.warn('Player error, retry now', error)
            this.replay()
        }
      } else {
        this.logger.warn('Play pipeline error (will retry):', pipeline.lastError)
        this.playTimeout = setTimeout(() => this.replay(), 1000)
      }
    })

    this.currentPipeline = pipeline
  }

  clear(): void {
    clearTimeout(this.playTimeout)
    
    this.streamer.clear()
    this.currentPipeline?.kill()
    this.currentPipeline = undefined
    this.logger.debug('Cleared')
  }

  play(input: Readable, baseAudioPid?: number, subtitlesPid?: number): void {
    this.clear()
    this.initPipeline(new PlayingPipeline(this.streamer, { input, baseAudioPid, subtitlesPid }))
  }

  replay(newProps: Partial<PlayingPipelineProps> = {}): void {
    const nextPipeline = this.currentPipeline?.clone(newProps)

    if (nextPipeline) {
      this.logger.info('Attempt replay')
      this.clear()
      this.initPipeline(nextPipeline)
    }
  }

  handleErroneousStreamError(): void {
    this.logger.warn('Erroneous stream, will attempt to replay')
    // reset to default audio and subtitles and try again
    this.replay({ baseAudioPid: undefined, subtitlesPid: undefined })
  }

  setAudioTrackFromPid(pid: number): void {
    if (pid !== this.currentPipeline?.baseAudioPid) {
      this.replay({ baseAudioPid: pid })
    }
  }

  setSubtitlesFromPid(pid: number | undefined): void {
    if (pid !== this.currentPipeline?.subtitlesPid) {
      this.replay({ subtitlesPid: pid })
    }
  }
}

export { FfmpegWrapper }
