import { Store } from './store'
import { ipcMain, IpcMainEvent } from 'electron'
import { IpcStreamer } from './ipcStreamer'
import { ITsDecryptorConfig, TsDecryptor } from '@taktik/ts-decryptor'
import { UdpStreamer } from '@taktik/udp-streamer'
import { IChannelData } from './interfaces/channelData'
import { ICurrentStreams } from './interfaces/currentStreams'
import { IStreamTrack } from './interfaces/streamTrack'
import { FfmpegCommand } from 'fluent-ffmpeg'
import { PlayerError, PlayerErrors } from './playerError'
import { FlowrFfmpeg } from './ffmpeg'
import { Readable, Writable } from 'stream'
import { IDecryption } from './interfaces/storedDecryption'
import Ffmpeg = require('fluent-ffmpeg')
import { IPlayerStreams } from './interfaces/playerPipeline'
import { IPlayerStore } from './interfaces/playerStore'
import { DEFAULT_PLAYER_STORE } from './playerStore'
import { IStreamerConfig } from './interfaces/ipcStreamerConfig'
import { ICircularBufferConfig } from '@taktik/buffers'
import { FfmpegChunker } from './ffmpegChunker'
import { Dispatcher } from './dispatcher'

export class Player {
  private streams?: IPlayerStreams
  private currentStreams?: ICurrentStreams
  private readonly _ipcEvents: {[key: string]: (...args: any[]) => void}
  private udpStreamer: UdpStreamer | null = null
  private decryptor: TsDecryptor | null = null
  private replayOnErrorTimeout: number | null = null
  private stopping: Promise<void> = Promise.resolve()
  private flowrFfmpeg: FlowrFfmpeg

  get playerStore(): IPlayerStore {
    const stored = this.store.get('player') || {}
    return { ...DEFAULT_PLAYER_STORE, ...stored }
  }

  get ipcStreamerConfig(): IStreamerConfig {
    return this.playerStore.streamer
  }

  get decryption(): IDecryption {
    return this.playerStore.decryption
  }

  get tsDecryptorConfig(): ITsDecryptorConfig {
    return this.playerStore.tsDecryptor
  }

  get udpStreamerConfig(): ICircularBufferConfig {
    return this.playerStore.udpStreamer
  }

  get ffmpegChunkerConfig(): IStreamerConfig {
    return this.playerStore.ffmpegChunker
  }

  constructor(private store: Store) {
    this._ipcEvents = {
      closestream: this.closestream.bind(this),
      pausestream: this.pausestream.bind(this),
      resumestream: this.resumestream.bind(this),
      getaudiostream: this.getaudiostream.bind(this),
      getSubtitleStreams: this.getSubtitleStreams.bind(this),
      setaudiostream: this.setaudiostream.bind(this),
      setsubtitlestream: this.setsubtitlestream.bind(this),
      typeofstream: this.typeofstream.bind(this),
      openurl: this.openUrl.bind(this),
      FlowrIsInitializing: this.stop.bind(this),
    }
    Object.entries(this._ipcEvents).forEach(event => ipcMain.on(event[0], event[1]))
    this.flowrFfmpeg = new FlowrFfmpeg()
  }

  updateChannelData(streams: ICurrentStreams) {
    const channelData = this.store.get('channelData') as IChannelData
    channelData[streams.url] = streams
    this.store.set('channelData', channelData)
  }

  closestream(evt: IpcMainEvent) {
    this.stop()
    evt.sender.send('streamclosed')
  }

  pausestream(evt: IpcMainEvent) {
    this.streams?.ffmpeg.kill('SIGSTOP')
    evt.sender.send('streampaused')
  }

  resumestream(evt: IpcMainEvent) {
    this.streams?.ffmpeg.kill('SIGCONT')
    evt.sender.send('streamresumed')
  }

  getaudiostream(evt: IpcMainEvent) {
    const audio = (this.currentStreams) ? this.currentStreams.audio : {}
    evt.sender.send('audiostreams', audio)
  }

  getSubtitleStreams(evt: IpcMainEvent) {
    const subtitles = (this.currentStreams) ? this.currentStreams.subtitles : {}
    evt.sender.send('subtitleStreams', subtitles)
  }

  async setaudiostream(evt: IpcMainEvent, selectedAudioStream: number) {
    if (this.currentStreams) {
      // retrieve proper
      this.currentStreams.audio.currentStream = selectedAudioStream
      await this.replay(this.currentStreams.url, this.currentStreams, evt)
      this.updateChannelData(this.currentStreams)
    }
  }

  async setsubtitlestream(evt: IpcMainEvent, selectedSubtitleStream: number) {
    if (this.currentStreams) {
      // retrieve proper
      if (selectedSubtitleStream !== this.currentStreams.subtitles.currentStream) {
        this.currentStreams.subtitles.currentStream = selectedSubtitleStream
        await this.replay(this.currentStreams.url, this.currentStreams, evt)
        this.updateChannelData(this.currentStreams)
      }
    }
  }

  async typeofstream(evt: IpcMainEvent, url: string) {
    const sendTypeOfStream = (stream: ICurrentStreams) => {
      if (stream.video?.tracks?.length > 0) {
        // is video
        evt.sender.send('typeofstream', 'video')
      } else if (stream.audio?.tracks?.length > 0) {
        // is audio
        evt.sender.send('typeofstream', 'audio')
      }
    }
    const channelData = this.store.get('channelData') as IChannelData
    const stream = channelData[url]
    if (stream) {
      sendTypeOfStream(stream)
    } else {
      try {
        await this.stopping
        const pipeline = await this.getStreamingPipeline(url)
        const metadata = await this.retrieveMetadata(pipeline)
        this.currentStreams = this.processStreams(metadata.streams, url)
        this.updateChannelData(this.currentStreams)
        sendTypeOfStream(this.currentStreams)
      } catch (e) {
        console.log('ffprobe failure:', e)
      }
    }
  }

  async openUrl(evt: IpcMainEvent, url: string): Promise<void> {
    try {
      console.log('----------- openUrl', url)
      await this.stopping
      const channelData = (this.store.get('channelData') || {}) as IChannelData
      const localCurrentStream: ICurrentStreams | undefined = channelData[url]
      const pipeline = await this.getStreamingPipeline(url)

      // If we already have info for this url, play it immediately
      if (localCurrentStream) {
        this.currentStreams = localCurrentStream
        await this.playUrl(pipeline, localCurrentStream, evt)
      }
      const metadata: Ffmpeg.FfprobeData = await this.retrieveMetadata(pipeline)
      const newStreamData: ICurrentStreams = this.processStreams(metadata.streams, url)
      const shouldReplay: boolean = this.hasStreamChanged(newStreamData, localCurrentStream)

      if (this.currentStreams && this.currentStreams.url === localCurrentStream?.url) {
        // We are playing the same content, reuse the audio and subtitles
        const currentAudioStream = this.currentStreams.audio.currentStream
        if (newStreamData.audio.tracks.some(track => track.pid === currentAudioStream)) {
          newStreamData.audio.currentStream = currentAudioStream
        }
        const currentSubtitleStream = this.currentStreams.subtitles.currentStream
        if (newStreamData.subtitles.tracks.some(track => track.pid === currentSubtitleStream)) {
          newStreamData.subtitles.currentStream = currentSubtitleStream
        }
      }

      this.currentStreams = newStreamData
      this.updateChannelData(newStreamData)
      if (shouldReplay) {
        await this.replay(newStreamData.url, newStreamData, evt)
      }
    } catch (e) {
      console.error('Failed to open url:', e)
    }
  }

  stop(shouldFlush: boolean = false): Promise<void> {
    return this.stopping = this.stopping
      .then(() => new Promise(async resolve => {
        try {
          clearTimeout(this.replayOnErrorTimeout)
          if (this.udpStreamer) {
            await this.udpStreamer.close()
          }
          if (this.streams) {
            await this.terminateStreams(this.streams, shouldFlush)
            this.streams = null
          }
        } catch (e) {
          console.error('An error occurred while stopping:', e)
        } finally {
          resolve()
        }
      }))
  }

  async terminateStreams(streams: IPlayerStreams, shouldFlush: boolean = false): Promise<void> {
    if (streams.input instanceof Readable) {
      await this.destroyStream(streams.input)
    }
    await this.killFfmpeg(streams.ffmpeg)
    if (shouldFlush) {
      streams.streamer.flush()
    }
    await this.destroyStream(streams.streamer)
  }

  // We need to wait a bit for the process to terminate
  // this prevents ffmpeg to catch output stream "close" event and throw an error
  killFfmpeg(process: FfmpegCommand): Promise<void> {
    return new Promise((resolve) => {
      process.on('error', resolve)
      process.kill('SIGKILL')
    })
  }

  destroyStream(stream: Readable | Writable): Promise<void> {
    return new Promise((resolve) => {
      stream.on('close', resolve)
      stream.destroy()
    })
  }

  async retrieveMetadata(input: string | Dispatcher): Promise<Ffmpeg.FfprobeData> {
    const ffprobeInput = this.getStreamInput(input)

    try {
      const metadata = await this.flowrFfmpeg.ffprobe(ffprobeInput, { timeout: 30 })
      return metadata
    } finally {
      if (ffprobeInput instanceof Readable) {
        await this.destroyStream(ffprobeInput)
      }
    }
  }

  hasStreamChanged(newStreamData: ICurrentStreams, localCurrentStream: ICurrentStreams | undefined): boolean {
    const isSameUrlButDifferentCodec: boolean = !!this.currentStreams &&
        this.currentStreams.url === localCurrentStream?.url &&
        this.currentStreams.video.tracks[0].codecName !== newStreamData.video.tracks[0].codecName
    const audioStreamExists = this.currentStreams.audio.currentStream === -1 ||
        newStreamData.audio.tracks.some(track => track.pid === this.currentStreams.audio.currentStream)
    const subtitlesStreamExists = this.currentStreams.subtitles.currentStream === -1 ||
        newStreamData.subtitles.tracks.some(track => track.pid === this.currentStreams.subtitles.currentStream)
    // If nothing is playing
    return !localCurrentStream ||
        // or if currently playing stream video track's codec name is different than the newly fetched one
        isSameUrlButDifferentCodec ||
        // or if current audio/subtitle streams do not exist anymore
        !audioStreamExists || !subtitlesStreamExists
  }

  async handleConversionError(evt: IpcMainEvent) {
    if (this.currentStreams) {
      // if conversion error, keep trying
      // replay will kill previous process
      await this.replay(this.currentStreams.url, this.currentStreams, evt)
    }
  }

  async handleErroneousStreamError(evt: IpcMainEvent) {
    if (this.currentStreams) {
      // reset to default audio and subtitles and try again
      this.currentStreams.audio.currentStream = (this.currentStreams.audio.tracks.length > 0) ? this.currentStreams.audio.tracks[0].pid : -1
      this.currentStreams.subtitles.currentStream = -1
      await this.replay(this.currentStreams.url, this.currentStreams, evt)
    }
  }

  getErrorHandler(evt: IpcMainEvent) {
    return (error: PlayerError) => {
      switch (error.code) {
        case PlayerErrors.CONVERSION:
          this.handleConversionError(evt)
          break
        case PlayerErrors.ERRONEOUS_STREAM:
          this.handleErroneousStreamError(evt)
          break
        case PlayerErrors.TERMINATED:
          // silence this, most probably we terminated the process on purpose
          break
        default:
          console.error('Player error', error)
      }
    }
  }

  async getDecryptionPipeline(url: string): Promise<Dispatcher> {
    // lazy instantiate if necessary
    const udpStreamer = this.udpStreamer || (this.udpStreamer = new UdpStreamer(this.udpStreamerConfig))
    // lazy instantiate if necessary
    const decryptor = this.decryptor || (this.decryptor = new TsDecryptor())
    const cleanUrl = url
        .replace(/\s/g, '') // remove whitespaces
        .replace(/(udp|rtp):\/\/@?(.+)/, '$2') // retrieve ip:port
    const ip = cleanUrl.split(':')[0]
    const port = parseInt(cleanUrl.split(':')[1], 10)
    const stream = await udpStreamer.connect(ip, port)
    const decryptorPipeline = decryptor.injest(stream, this.tsDecryptorConfig)
    const pipeline = decryptorPipeline.pipe(new Dispatcher())

    pipeline.on('close', async () => {
      try {
        await this.destroyStream(decryptorPipeline)
      } catch (e) {
        console.log('Could not destroy decryptorPipeline', e)
      }
      try {
        await this.destroyStream(stream)
      } catch (e) {
        console.log('Could not destroy udp stream', e)
      }
    })
    return pipeline
  }

  async getStreamingPipeline(url: string): Promise<string | Dispatcher> {
    let input: string | Dispatcher

    if (this.decryption.use) {
      input = await this.getDecryptionPipeline(url)
    } else {
      input = url
    }

    return input
  }

  getStreamInput(input: string | Dispatcher): string | Readable {
    let playInput: string | Readable

    if (input instanceof Dispatcher) {
      playInput = input.pipe(new FfmpegChunker(this.ffmpegChunkerConfig))
    } else {
      playInput = input
    }

    return playInput
  }

  getFfmpegStream(evt: IpcMainEvent, input: string | Readable, streamToPlay: ICurrentStreams): FfmpegCommand {
    if (streamToPlay.video.tracks.length > 0) {
      const videoStreamChannel = streamToPlay.video.tracks[0].pid
      const audiostreamChannel = streamToPlay.audio.currentStream
      const subtitleStreamChannel = streamToPlay.subtitles.currentStream
      const isDeinterlacingEnabled = this.store.get('deinterlacing')
      return this.flowrFfmpeg.getVideoMpegtsPipeline(input, videoStreamChannel, audiostreamChannel, subtitleStreamChannel, isDeinterlacingEnabled, this.getErrorHandler(evt))
    }
    if (streamToPlay.audio.tracks.length > 0) {
      return this.flowrFfmpeg.getAudioMpegtsPipeline(input, this.getErrorHandler(evt))
    }
    throw new PlayerError('No stream', PlayerErrors.NO_STREAM)
  }

  async playUrl(input: string | Dispatcher, streamToPlay: ICurrentStreams, evt: IpcMainEvent) {
    clearTimeout(this.replayOnErrorTimeout)
    const streamInput = this.getStreamInput(input)
    const ffmpeg = this.getFfmpegStream(evt, streamInput, streamToPlay)
    const streamer = ffmpeg.pipe(new IpcStreamer(evt, this.ipcStreamerConfig)) as IpcStreamer
    this.streams = { input: streamInput, ffmpeg, streamer }

    if (streamInput instanceof Readable) {
      streamInput.on('error', async (error: Error) => {
        console.error('------------- Error in play pipeline -------------')
        console.error(error)
        console.error('------------- ---------------------- -------------')
        this.replayOnErrorTimeout = setTimeout(async () => this.replay(streamToPlay.url, streamToPlay, evt), 200)
      })
    }
  }

  async replay(url: string, streamToPlay: ICurrentStreams, evt: IpcMainEvent) {
    await this.stop(true)
    const pipeline = await this.getStreamingPipeline(url)
    await this.playUrl(pipeline, streamToPlay, evt)
  }

  processStreams (streams: Ffmpeg.FfprobeStream[], url: string): ICurrentStreams {
    const audioTracks: IStreamTrack[] = streams
        .filter((stream: Ffmpeg.FfprobeStream) => stream.codec_type === 'audio')
        .map((stream: Ffmpeg.FfprobeStream, index: number) => ({
          index,
          code: (stream.tags?.language === '???') ? 'zzz' : stream.tags?.language,
          pid: stream.index,
          codecName: stream.codec_name,
        }),
      )

    const subtitleTracks: IStreamTrack[] = streams
        .filter((stream: Ffmpeg.FfprobeStream) => stream.codec_type === 'subtitle')
        .map((stream: Ffmpeg.FfprobeStream, index: number) => ({
          index,
          code: (stream.tags?.language === '???') ? 'zzz' : stream.tags?.language,
          pid: stream.index,
          codecName: stream.codec_name,
        }),
      )

    const videoTracks: IStreamTrack[] = streams
        .filter((stream: Ffmpeg.FfprobeStream)  => stream.codec_type === 'video')
        .map((stream: Ffmpeg.FfprobeStream, index: number) => ({
          index,
          pid: stream.index,
          codecName: stream.codec_name,
        }),
      )

    return {
      url,
      video: { tracks: videoTracks },
      audio: {
        tracks: audioTracks,
        currentStream: (audioTracks.length > 0) ? audioTracks[0].pid : -1,
      },
      subtitles: {
        tracks: subtitleTracks,
        currentStream: -1,
      },
    }
  }

  close() {
    this.stop()
    Object.entries(this._ipcEvents).forEach(event => ipcMain.removeListener(event[0], event[1]))
  }
}
