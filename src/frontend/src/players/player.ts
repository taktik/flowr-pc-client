import { IpcMainEvent, WebContents } from 'electron'
import { IPlayerStore, PipelineType } from '../interfaces/playerStore'
import { TransmuxerWrapper } from './transmuxer'
import { MainPipeline } from './pipelines/main'
import { FfmpegWrapper } from './pipelines/ffmpegWrapper'
import { Readable } from 'stream'
import { UdpStreamerError, UdpStreamerErrors } from '@taktik/udp-streamer'
import { IPipelineTail } from '../interfaces/playerPipeline'
import { AbstractPlayer, PlayProps, SubtitlesProps } from './abstractPlayer'
import { Store } from '../store'

export class Player extends AbstractPlayer {
  private replayOnErrorTimeout: number | null = null

  private playPipelineHead: MainPipeline
  private playPipelineHeadOutput?: Readable
  private transmuxer: TransmuxerWrapper
  private ffmpegWrapper: FfmpegWrapper
  private playPipelineTail?: IPipelineTail

  constructor(store: Store<IPlayerStore>) {
    super(store)
    this.playPipelineHead = new MainPipeline(this.store)
    this.transmuxer = new TransmuxerWrapper()
    this.ffmpegWrapper = new FfmpegWrapper(this.store)
  }

  plugPipelineTail(sender: WebContents, audioPid: number | undefined, subtitlesPid: number | undefined): void {
    if (!this.playPipelineHeadOutput) {
      return
    }
    const confPipeline = this.store.get('pipeline').use
    const useFfmpeg = (confPipeline === PipelineType.FFMPEG) || !!subtitlesPid
    this.log.info(`--------- USING FFMPEG PIPELINE: ${useFfmpeg ? 'yes' : 'no'} (pipeline from conf: ${confPipeline}, subtitles pid: ${subtitlesPid}) ---------`)
    this.playPipelineTail = useFfmpeg ? this.ffmpegWrapper : this.transmuxer
    this.playPipelineTail.sender = sender
    this.playPipelineTail.play(this.playPipelineHeadOutput, audioPid, subtitlesPid)
  }

  async play({ sender }: IpcMainEvent, { url, audioPid, subtitlesPid }: PlayProps): Promise<void> {
    this.log.info('--------- PLAY', url, '---------')

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

  clearPipelineTail(): void {
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

  async stop(): Promise<void> {
    this.log.info('--------- STOPPING ---------')
    if (this.replayOnErrorTimeout) {
      clearTimeout(this.replayOnErrorTimeout)
    }
    this.playPipelineHeadOutput = undefined
    await this.playPipelineHead?.clear()

    this.clearPipelineTail()
    this.log.info('--------- STOPPED ---------')
  }

  setAudioTrack(_: IpcMainEvent, pid: number): void {
    this.playPipelineTail?.setAudioTrackFromPid(pid)
  }

  setSubtitles({ sender }: IpcMainEvent, { audioPid, subtitlesPid }: SubtitlesProps): void {
    if (!this.playPipelineHeadOutput && this.playPipelineTail) {
      return
    }

    this.log.info('--------- SETTING SUBTITLE PID', subtitlesPid, '---------')
    if (this.playPipelineTail === this.transmuxer) {
      // Switch to FFMPEG
      this.clearPipelineTail()
      this.plugPipelineTail(sender, audioPid, subtitlesPid)
    } else if (this.playPipelineTail === this.ffmpegWrapper) {
      this.playPipelineTail.setSubtitlesFromPid(subtitlesPid)
    }
  }

  /* Should be implemented in FLOW-5509 Bedside FlowR v5 | Barco | Play/Pause*/
  /* eslint-disable @typescript-eslint/no-unused-vars */
  backToLive(event: Electron.IpcMainEvent): void | Promise<void> {
      throw Error("not available")
  }
  /* eslint-disable @typescript-eslint/no-unused-vars */
  pause(event: Electron.IpcMainEvent): void | Promise<void> {
      throw Error("not available")
  }
  /* eslint-disable @typescript-eslint/no-unused-vars */
  resume(event: Electron.IpcMainEvent): void | Promise<void> {
      throw Error("not available")
  }
}
