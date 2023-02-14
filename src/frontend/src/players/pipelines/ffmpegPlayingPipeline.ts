import { TrackInfo, TrackInfoStream } from '@taktik/mux.js'
import { PassThrough, Readable } from 'stream'
import { State, StateMachineImpl, Transitions } from 'typescript-state-machine'
import { IStreamerConfig } from '../../interfaces/ipcStreamerConfig'
import { PipelinePlayOptions } from '../../interfaces/playerPipeline'
import { getLogger } from '../../logging/loggers'
import { Dispatcher } from '../dispatcher'
import { getAudioMpegtsPipeline, getVideoPipeline } from '../ffmpeg'
import { IpcStreamer } from '../ipcStreamer'
import { PlayerError, PlayerErrors } from '../playerError'

import type { IFfmpegCommandWrapper } from '../types'

enum PipelineStateName {
  STARTING = 'Starting',
  RETRIEVING_METADATA = 'Retrieving metadata',
  RETRIEVED_METADATA = 'Retrieved metadata',
  PLAYING = 'Playing',
  KILLED = 'Killed',
  ERROR = 'Error',
}

class PipelineState extends State {
  label: PipelineStateName
}

const STARTING = new PipelineState(PipelineStateName.STARTING)
const RETRIEVING_METADATA = new PipelineState(PipelineStateName.RETRIEVING_METADATA)
const RETRIEVED_METADATA = new PipelineState(PipelineStateName.RETRIEVED_METADATA)
const PLAYING = new PipelineState(PipelineStateName.PLAYING)
const KILLED = new PipelineState(PipelineStateName.KILLED)
const ERROR = new PipelineState(PipelineStateName.ERROR)

const PlayingPipelineStates = { STARTING, RETRIEVING_METADATA, RETRIEVED_METADATA, PLAYING, KILLED, ERROR }

const transitions: Transitions<PipelineState> = {
  [PipelineStateName.STARTING]: [RETRIEVING_METADATA, ERROR],
  [PipelineStateName.RETRIEVING_METADATA]: [RETRIEVED_METADATA, KILLED, ERROR],
  [PipelineStateName.RETRIEVED_METADATA]: [PLAYING, ERROR],
  [PipelineStateName.PLAYING]: [KILLED, ERROR],
  [PipelineStateName.KILLED]: [],
  [PipelineStateName.ERROR]: [KILLED],
}

/**
 * State machine that handles ffmpeg process
 * May safely be killed at the same time as a new one is initialized
 */
class PlayingPipeline extends StateMachineImpl<PipelineState> {
  private id = `${Date.now()}-${Math.floor(100 * Math.random())}`
  private logger = getLogger(`FfmpegPlayingPipeline [${this.id}]`)
  private dispatcher = new Dispatcher()
  private metadataProcess?: { stream: TrackInfoStream, dataCb: (trackInfo: TrackInfo) => void, errorCb: (e: Error) => void }
  private input: Readable
  private command?: IFfmpegCommandWrapper
  private trackInfo?: TrackInfo
  
  readonly subtitlesPid?: number
  readonly deinterlace: boolean
  
  baseAudioPid?: number
  lastError?: Error

  constructor(
    private readonly streamer: IpcStreamer,
    private readonly parserConfig: IStreamerConfig,
    { input, audioPid, subtitlesPid, deinterlace = false }: PipelinePlayOptions
  ) {
    super(Object.values(PlayingPipelineStates), transitions, STARTING)
    this.input = input
    this.baseAudioPid = audioPid
    this.subtitlesPid = subtitlesPid
    this.deinterlace = deinterlace
    this.logger.debug('Play command received')

    this.registerStateChanges()
    this.retrieveMetadata()
    input.pipe(this.dispatcher)
  }

  private registerStateChanges() {
    this.onEnterState(RETRIEVED_METADATA, this.play.bind(this))
  }

  private handleError(e: Error): void {
    // Ignore errors if already killed
    if (this.inState(KILLED)) return
    this.lastError = e
    this.setState(ERROR)
  }

  private killMetadataProcess(): void {
    if (this.metadataProcess) {
      const { stream, dataCb, errorCb } = this.metadataProcess

      this.dispatcher.unpipe(stream)
      stream.off('data', dataCb)
      stream.off('error', errorCb)
      stream.destroy()

      this.metadataProcess = undefined
    }
  }

  private retrieveMetadata(): void {
    try {
      this.logger.debug('Will retrieve metadata')
      this.setState(RETRIEVING_METADATA)
      const stream = new TrackInfoStream(true)
      this.dispatcher.pipe(stream)
  
      const dataCb = (trackInfo: TrackInfo) => {
        this.logger.debug('Metadata success')
        this.streamer.sendTrackInfo(trackInfo)
        this.trackInfo = trackInfo
        this.killMetadataProcess()
        this.setState(RETRIEVED_METADATA)
      }
  
      const errorCb = (e: Error) => {
        this.logger.debug('Metadata error')
        this.killMetadataProcess()
        this.handleError(e)
      }
  
      stream.on('data', dataCb)
      stream.on('error', errorCb)
  
      this.metadataProcess = { stream, dataCb, errorCb }
    } catch (error) {
      this.handleError(error)
    }
  }

  private getErrorHandler() {
    return (error: PlayerError): void => {
      switch (error.code) {
        case PlayerErrors.TERMINATED:
          // silence this, most probably we terminated the process on purpose
          this.logger.debug('Process terminated')
          break
        default:
          this.logger.warn('Player error', error)
          this.handleError(error)
      }
    }
  }

  private play() {
    try {
      if (!this.trackInfo) {
        throw Error('Attempt to play without track info. This should never happen.')
      }
      const audioPid = this.baseAudioPid ?? this.trackInfo.audio.reduce((min, audio) => Math.min(min, audio.pid), 99999)
      const ffmpegInput = this.dispatcher.pipe(new PassThrough({ autoDestroy: false }))
      this.baseAudioPid = audioPid
      const init = this.trackInfo.video
        ? getVideoPipeline({
            input: ffmpegInput,
            audioPid,
            subtitlesPid: this.subtitlesPid,
            deinterlace: this.deinterlace,
            errorHandler: this.getErrorHandler(),
          })
        : getAudioMpegtsPipeline(this.input, this.getErrorHandler())

      this.command = init(this.parserConfig)

      this.streamer.currentAudioPid = audioPid
      this.command.pipe(this.streamer, { end: false })
      this.setState(PLAYING)
      this.logger.debug('Play command executed, current stream has been set')
    } catch (e) {
      this.handleError(e)
    }
  }

  kill(): void {
    this.command?.unpipe(this.streamer)
    this.command?.kill()
    this.killMetadataProcess()
    this.dispatcher.clear()
    this.input.unpipe(this.dispatcher)
    this.setState(KILLED)
  }

  clone(overrideProps: Partial<PipelinePlayOptions> = {}): PlayingPipeline {
    const { streamer, input, baseAudioPid, subtitlesPid, deinterlace } = this
    return new PlayingPipeline(streamer, this.parserConfig, {
      input,
      audioPid: baseAudioPid,
      subtitlesPid,
      deinterlace,
      ...overrideProps
    })
  }
}

export {
  PlayingPipeline,
  PlayingPipelineStates,
}
