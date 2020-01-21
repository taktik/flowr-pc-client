import { Store } from './store'
import { ipcMain, IpcMainEvent } from 'electron'
import { IpcStreamer } from './ipcStreamer'
import { ITsDecryptorConfig, TsDecryptor } from '@taktik/ts-decryptor'
import { IUdpStreamerConfig, UdpStreamer } from '@taktik/udp-streamer'
import { IChannelData } from './interfaces/channelData'
import { ICurrentStreams } from './interfaces/currentStreams'
import { IStreamTrack } from './interfaces/streamTrack'
import { FfmpegCommand } from 'fluent-ffmpeg'
import { PlayerError, PlayerErrors } from './playerError'
import { getVideoMpegtsPipeline, getAudioMpegtsPipeline, ffprobe } from './ffmpeg'
import { Readable } from 'stream'
import { IDecryption } from './interfaces/storedDecryption'
import Ffmpeg = require('fluent-ffmpeg')
import { IPlayerStreams } from './interfaces/playerPipeline'
import { IPlayerStore } from './interfaces/playerStore'
import { DEFAULT_PLAYER_STORE } from './playerStore'
import { IIpcStreamerConfig } from './interfaces/ipcStreamerConfig'

export class Player {
  private streams?: IPlayerStreams
  private currentStreams?: ICurrentStreams
  private readonly _ipcEvents: {[key: string]: (...args: any[]) => void}
  private udpStreamer: UdpStreamer | null = null
  private decryptor: TsDecryptor | null = null

  get playerStore(): IPlayerStore {
    const stored = this.store.get('player') || {}
    return { ...DEFAULT_PLAYER_STORE, ...stored }
  }

  get ipcStreamerConfig(): IIpcStreamerConfig {
    return this.playerStore.streamer
  }

  get decryption(): IDecryption {
    return this.playerStore.decryption
  }

  get tsDecryptorConfig(): ITsDecryptorConfig {
    return this.playerStore.tsDecryptor
  }

  get udpStreamerConfig(): IUdpStreamerConfig {
    return this.playerStore.udpStreamer
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
      await this.playUrl(this.currentStreams.url, this.currentStreams, evt)
      this.updateChannelData(this.currentStreams)
    }
  }

  async setsubtitlestream(evt: IpcMainEvent, selectedSubtitleStream: number) {
    if (this.currentStreams) {
      // retrieve proper
      if (selectedSubtitleStream !== this.currentStreams.subtitles.currentStream) {
        this.currentStreams.subtitles.currentStream = selectedSubtitleStream
        await this.playUrl(this.currentStreams.url, this.currentStreams, evt)
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
        const metadata: Ffmpeg.FfprobeData = await this.retrieveMetadata(url)
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
      const channelData = (this.store.get('channelData') || {}) as IChannelData
      const localCurrentStream: ICurrentStreams | undefined = channelData[url]

      // If we already have info for this url, play it immediately
      if (localCurrentStream) {
        this.currentStreams = localCurrentStream
        await this.playUrl(url, localCurrentStream, evt)
      }
      const metadata: Ffmpeg.FfprobeData = await this.retrieveMetadata(url)
      const newStreamData: ICurrentStreams = this.processStreams(metadata.streams, url)
      const shouldPlay = this.hasStreamChanged(newStreamData, localCurrentStream)

      if (this.currentStreams && this.currentStreams.url === localCurrentStream?.url) {
        // We are playing the same content, reuse the audio and subtitles
        newStreamData.subtitles.currentStream = this.currentStreams.subtitles.currentStream
        newStreamData.audio.currentStream = this.currentStreams.audio.currentStream
      }

      this.currentStreams = newStreamData
      this.updateChannelData(newStreamData)

      if (shouldPlay) {
        await this.playUrl(newStreamData.url, newStreamData, evt)
      }
    } catch (e) {
      console.error('Failed to open url:', e)
    }
  }

  async stop() {
    clearTimeout(this.replayOnErrorTimeout)
    if (this.streams) {
      await this.terminateStream(this.streams)
      this.streams = null
    }
    if (this.udpStreamer) {
      await this.udpStreamer.close()
    }
  }

  async terminateStream(streams: IPlayerStreams) {
    if (streams.input instanceof Readable) {
      streams.input.destroy()
    }
    await this.killAndWait(streams.ffmpeg)
    streams.pipeline.destroy()
    streams = null
  }

  // We need to wait a bit for the process to terminate
  // this prevents ffmpeg to catch output stream "close" event and throw an error
  killAndWait(process: FfmpegCommand) {
    process.kill('SIGKILL')
    return new Promise((resolve) => {
      setTimeout(resolve, 50)
    })
  }

  async retrieveMetadata(url: string): Promise<Ffmpeg.FfprobeData> {
    let input: string | Readable

    if (this.decryption.use) {
      input = await this.getDecryptionPipeline(url)
    } else {
      input = url
    }

    try {
      const metadata = await ffprobe(input, { timeout: 30 })
      return metadata
    } finally {
      if (input instanceof Readable) {
        input.destroy()
      }
    }
  }

  hasStreamChanged(newStreamData: ICurrentStreams, localCurrentStream: ICurrentStreams | undefined): boolean {
    // If current and new streams first video track's codec name is different
    // or if no local current stream
    const isSameUrlButDifferentCodec: boolean = !!this.currentStreams &&
        this.currentStreams.url === localCurrentStream?.url &&
        this.currentStreams.video.tracks[0].codecName !== newStreamData.video.tracks[0].codecName
    return !localCurrentStream || isSameUrlButDifferentCodec
  }

  async handleConversionError(evt: IpcMainEvent) {
    if (this.currentStreams) {
      // if conversion error, keep trying
      // playUrl will kill previous process
      await this.playUrl(this.currentStreams.url, this.currentStreams, evt)
    }
  }

  async handleErroneousStreamError(evt: IpcMainEvent) {
    if (this.currentStreams) {
      // reset to default audio and subtitles and try again
      this.currentStreams.audio.currentStream = (this.currentStreams.audio.tracks.length > 0) ? this.currentStreams.audio.tracks[0].pid : -1
      this.currentStreams.subtitles.currentStream = -1
      await this.playUrl(this.currentStreams.url, this.currentStreams, evt)
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

  async getDecryptionPipeline(url: string): Promise<Readable> {
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
    const pipeline = decryptor.injest(stream, this.tsDecryptorConfig)
    pipeline.on('close', () => {
      try {
        stream.destroy()
      } catch (e) {
        console.log('Could not destroy udp stream', e)
      }
    })
    return pipeline
  }

  getFfmpegStream(evt: IpcMainEvent, input: string | Readable, streamToPlay: ICurrentStreams): FfmpegCommand {
    if (streamToPlay.video.tracks.length > 0) {
      const currentVideoCodec = streamToPlay.video.tracks[0].codecName
      const videoStreamChannel = streamToPlay.video.tracks[0].pid
      const subtitleStreamChannel = streamToPlay.subtitles.currentStream
      const audiostreamChannel = streamToPlay.audio.currentStream
      const isDeinterlacingEnabled = this.store.get('deinterlacing')
      return getVideoMpegtsPipeline(input, videoStreamChannel, audiostreamChannel, subtitleStreamChannel, currentVideoCodec, isDeinterlacingEnabled, this.getErrorHandler(evt))
    }
    if (streamToPlay.audio.tracks.length > 0) {
      return getAudioMpegtsPipeline(input, this.getErrorHandler(evt))
    }
    throw new PlayerError('No stream', PlayerErrors.NO_STREAM)
  }

  replayOnErrorTimeout: number | null = null

  async playUrl(url: string, streamToPlay: ICurrentStreams, evt: IpcMainEvent) {
    console.log('----------- playUrl', url)
    clearTimeout(this.replayOnErrorTimeout)
    await this.stop()

    let input: string | Readable

    if (this.decryption.use) {
      input = await this.getDecryptionPipeline(url)
      input.on('error', async (error: Error) => {
        console.error('------------- Error in play pipeline -------------')
        console.error(error)
        console.error('------------- ---------------------- -------------')
        this.replayOnErrorTimeout = setTimeout(async () => await this.playUrl(url, streamToPlay, evt), 200)
      })
    } else {
      input = url
    }

    const ffmpeg = this.getFfmpegStream(evt, input, streamToPlay)
    const streamer = new IpcStreamer(evt, this.ipcStreamerConfig)
    const pipeline = ffmpeg.pipe(streamer)

    this.streams = { input, ffmpeg, pipeline }
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
