import { ipcMain, IpcMainEvent, WebContents } from 'electron'
import { mergeWith } from 'lodash'
import { IFlowrStore } from './interfaces/flowrStore'
import { IPlayerStore, PipelineType } from './interfaces/playerStore'
import { Store } from './store'
import { storeManager } from '../../launcher'
import { DEFAULT_PLAYER_STORE } from './playerStore'
import { TransmuxerWrapper } from './transmuxer'
import { MainPipeline } from './pipelines/main'
import { FfmpegWrapper } from './pipelines/ffmpegWrapper'
import { Readable } from 'stream'
import { UdpStreamerError, UdpStreamerErrors } from '@taktik/udp-streamer'
import { IPipelineTail } from './interfaces/playerPipeline'

export class Player {
  private readonly _ipcEvents: {[key: string]: (...args: any[]) => void}
  private store: Store<IPlayerStore> = storeManager.createStore<IPlayerStore>('player', DEFAULT_PLAYER_STORE)
  private replayOnErrorTimeout: number | null = null

  private playPipelineHead?: MainPipeline
  private playPipelineHeadOutput?: Readable
  private transmuxer?: TransmuxerWrapper
  private ffmpegWrapper?: FfmpegWrapper
  private playPipelineTail?: IPipelineTail

  constructor(private flowrStore: Store<IFlowrStore>) {
    this._ipcEvents = {
      closestream: this.stop.bind(this),
      getSubtitleStreams: () => {},
      setsubtitlestream: () => {},
      openurl: this.play.bind(this),
      FlowrIsInitializing: this.stop.bind(this),
      setAudioPid: this.setAudioTrackFromPid.bind(this),
      setSubtitlesPid: this.setSubtitlesFromPid.bind(this),
    }
    Object.entries(this._ipcEvents).forEach(event => ipcMain.on(event[0], event[1]))
  }

  initStore(playerConfig: IPlayerStore): void {
    const shouldPersist = !storeManager.exists('player')

    if (storeManager.exists('player')) {
      const playerConfigMerged = mergeWith({}, this.flowrStore.data.player, DEFAULT_PLAYER_STORE, playerConfig, (a, b) => b === null || b === '' ? a : undefined)
      this.store.bulkSet(playerConfigMerged)
    }

    if (shouldPersist) {
      this.store.persist()
    }

    this.setupPipeline()
  }

  setupPipeline() {
    this.playPipelineHead = new MainPipeline(this.store)
    this.transmuxer = new TransmuxerWrapper()
    this.ffmpegWrapper = new FfmpegWrapper(this.store)
  }

  plugPipelineTail(sender: WebContents, audioPid: number | undefined, subtitlesPid: number | undefined) {
    if (!this.playPipelineHeadOutput) {
      return
    }
    const confPipeline = this.store.get('pipeline').use
    const useFfmpeg = (confPipeline === PipelineType.FFMPEG) || subtitlesPid
    console.log(`--------- USING FFMPEG PIPELINE: ${useFfmpeg} (pipeline from conf: ${confPipeline}, subtitles pid: ${subtitlesPid}) ---------`)
    this.playPipelineTail = useFfmpeg ? this.ffmpegWrapper : this.transmuxer
    this.playPipelineTail.sender = sender
    this.playPipelineTail.play(this.playPipelineHeadOutput, audioPid, subtitlesPid)
  }

  async play({ sender }: IpcMainEvent, { url, audioPid, subtitlesPid }: any) {
    console.log('--------- PLAY', url, '---------')
    // First of all, check if pipeline is set
    if (!this.playPipelineHead) {
      this.setupPipeline()
    }

    if (this.replayOnErrorTimeout) {
      clearTimeout(this.replayOnErrorTimeout)
    }

    try {
      this.playPipelineHeadOutput = await this.playPipelineHead.connect(url)
    } catch (e) {
      if (e instanceof UdpStreamerError && e.code === UdpStreamerErrors.CONNECTED) {
        await this.playPipelineHead.clear()
        this.playPipelineHeadOutput = await this.playPipelineHead.connect(url)
      }
    }

    this.plugPipelineTail(sender, audioPid, subtitlesPid)
  }

  clearPipelineTail() {
    if (!this.playPipelineTail) {
      return
    }

    if (this.playPipelineTail === this.transmuxer) {
      // TODO: do this in transmuxer's clear
      this.playPipelineHead?.unpipe(this.transmuxer)
    }

    this.playPipelineTail.clear()
    this.playPipelineTail = undefined
  }

  async stop() {
    console.log('--------- STOPPING ---------')
    if (this.replayOnErrorTimeout) {
      clearTimeout(this.replayOnErrorTimeout)
    }
    this.playPipelineHeadOutput = undefined
    await this.playPipelineHead?.clear()

    this.clearPipelineTail()
    console.log('--------- STOPPED ---------')
  }

  async replay(evt: IpcMainEvent, url: string) {
    await this.stop()
    await this.play(evt, url)
  }

  close() {
    this.stop()
    Object.entries(this._ipcEvents).forEach(event => ipcMain.removeListener(event[0], event[1]))
  }

  setAudioTrackFromPid(_: any, pid: number) {
    this.playPipelineTail?.setAudioTrackFromPid(pid)
  }

  setSubtitlesFromPid({ sender }: IpcMainEvent, { audioPid, subtitlesPid }: any) {
    if (!this.playPipelineHeadOutput && this.playPipelineTail) {
      return
    }
    console.log('--------- SETTING SUBTITLE PID', subtitlesPid, '---------')
    if (this.playPipelineTail === this.transmuxer) {
      // Switch to FFMPEG
      this.clearPipelineTail()
      this.plugPipelineTail(sender, audioPid, subtitlesPid)
    } else if (this.playPipelineTail === this.ffmpegWrapper) {
      this.playPipelineTail.setSubtitlesFromPid(subtitlesPid)
    }
  }
}
