import { IpcStreamer } from '../ipcStreamer'
import { Store } from '../../store'
import { IPlayerStore } from '../../interfaces/playerStore'
import { WebContents } from 'electron'
import { PlayerError, PlayerErrors } from '../playerError'
import { IPipelineTail, PipelinePlayOptions } from '../../interfaces/playerPipeline'
import { getLogger } from '../../logging/loggers'
import { PlayingPipeline, PlayingPipelineStates } from './ffmpegPlayingPipeline'
import { IStreamerConfig } from '../../interfaces/ipcStreamerConfig'

class FfmpegWrapper implements IPipelineTail {
  private id = `${Date.now()}-${Math.floor(1000 * Math.random())}`
  private logger = getLogger(`FfmpegWrapper [${this.id}]`)
  private streamer = new IpcStreamer()
  private readonly streamerConfig: IStreamerConfig
  private currentPipeline?: PlayingPipeline
  private playTimeout?: NodeJS.Timeout

  set sender(sender: WebContents) {
    this.streamer.sender = sender
  }

  constructor(store: Store<IPlayerStore>) {
    this.streamerConfig = store.get('streamer')
  }

  private initPipeline(pipeline: PlayingPipeline): void {
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
        this.replayIn(1000)
      }
    })

    this.currentPipeline = pipeline
  }

  clear(): void {
    clearTimeout(this.playTimeout)
    
    try {
      this.streamer.clear()
    } catch (error) {
      this.logger.warn('An error occurred when clearing the streamer', error)
    }
    try {
      this.currentPipeline?.kill()
    } catch (error) {
      this.logger.warn('An error occurred when killing the pipeline', error)
    }
    this.currentPipeline = undefined
    this.logger.debug('Cleared')
  }

  play(options: PipelinePlayOptions): void {
    this.clear()
    this.initPipeline(new PlayingPipeline(this.streamer, this.streamerConfig, options))
  }

  replay(newProps: Partial<PipelinePlayOptions> = {}): void {
    try {
      const nextPipeline = this.currentPipeline?.clone(newProps)
  
      if (nextPipeline) {
        this.logger.info('Attempt replay')
        this.clear()
        this.initPipeline(nextPipeline)
      }
    } catch (error) {
      this.logger.warn('Replay failure, will retry again soon', error)
      this.replayIn(5000, newProps)
    }
  }

  replayIn(time: number, newProps: Partial<PipelinePlayOptions> = {}): void {
    clearTimeout(this.playTimeout)
    this.playTimeout = setTimeout(() => this.replay(newProps), time)
  }

  handleErroneousStreamError(): void {
    this.logger.warn('Erroneous stream, will attempt to replay')
    // reset to default audio and subtitles and try again
    this.replay({ audioPid: undefined, subtitlesPid: undefined })
  }

  setAudioTrackFromPid(pid: number): void {
    if (pid !== this.currentPipeline?.audioPid) {
      this.replay({ audioPid: pid })
    }
  }

  setSubtitlesFromPid(pid: number | undefined): void {
    if (pid !== this.currentPipeline?.subtitlesPid) {
      this.replay({ subtitlesPid: pid })
    }
  }

  pause(): void {
    this.streamer.pause()
  }

  resume(): void {
    this.streamer.resume()
  }
}

export { FfmpegWrapper }
