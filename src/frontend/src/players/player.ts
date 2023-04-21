import { IpcMainEvent, WebContents } from 'electron'
import { IPlayerStore, PipelineType } from '../interfaces/playerStore'
import { TransmuxerWrapper } from './transmuxer'
import { MainPipeline } from './pipelines/main'
import { FfmpegWrapper } from './pipelines/ffmpegWrapper'
import { Readable } from 'stream'
import { UdpStreamerError, UdpStreamerErrors } from '@taktik/udp-streamer'
import { AbstractPlayer, PlayProps, SubtitlesProps } from './abstractPlayer'
import { Store } from '../store'
import type { IPipelineTail, PipelineTailConfig } from '../interfaces/playerPipeline'

export class Player extends AbstractPlayer {
  private playPipelineHead: MainPipeline
  private playPipelineHeadOutput?: Readable
  private transmuxer: TransmuxerWrapper
  private ffmpegWrapper: FfmpegWrapper
  private playPipelineTail?: IPipelineTail

  constructor(store: Store<IPlayerStore>, readonly deinterlace: boolean) {
    super(store)
    this.playPipelineHead = new MainPipeline(this.store)
    this.transmuxer = new TransmuxerWrapper()
    this.ffmpegWrapper = new FfmpegWrapper(this.store)
  }

  private plugPipelineTail({ sender, audioPid, pipelineHeadOutput, subtitlesPid }: PipelineTailConfig): void {
    const confPipeline = this.store.get('pipeline').use
    const useFfmpeg = (confPipeline === PipelineType.FFMPEG) || !!subtitlesPid
    this.log.info(`--------- USING FFMPEG PIPELINE: ${useFfmpeg ? 'yes' : 'no'} (pipeline from conf: ${confPipeline}, subtitles pid: ${subtitlesPid}) ---------`)
    this.playPipelineHeadOutput = pipelineHeadOutput
    this.playPipelineTail = useFfmpeg ? this.ffmpegWrapper : this.transmuxer
    this.playPipelineTail.sender = sender
    this.playPipelineTail.play({ input: pipelineHeadOutput, audioPid, subtitlesPid, deinterlace: this.deinterlace })
  }

  private async connectHeadAndPlugTail(sender: WebContents, { url, audioPid, subtitlesPid }: PlayProps): Promise<void> {
    const pipelineHeadOutput = await this.playPipelineHead.connect(url)
    this.plugPipelineTail({ sender, audioPid, pipelineHeadOutput, subtitlesPid })
  }

  private clearPipelineTail(): void {
    if (!this.playPipelineTail) {
      return
    }

    // Only if transmuxer, already done in ffmpeg
    if (this.playPipelineTail === this.transmuxer) {
      // TODO: do this in transmuxer's clear
      this.playPipelineHead?.unpipe(this.transmuxer)
    }

    this.playPipelineTail.clear()
    this.playPipelineTail = undefined
  }

  async play({ sender }: IpcMainEvent, playProps: PlayProps): Promise<void> {
    this.log.info(`--------- Received play request for url: ${playProps.url} (a: ${playProps.audioPid}, s: ${playProps.subtitlesPid})---------`)

    try {
      await this.connectHeadAndPlugTail(sender, playProps)
    } catch (e) {
      if (e instanceof UdpStreamerError && e.code === UdpStreamerErrors.CONNECTED) {
        try {
          this.log.debug('UDP Streamer already connected, clear it first')
          await this.playPipelineHead.clear()
          await this.connectHeadAndPlugTail(sender, playProps)
        } catch (error) {
          this.log.warn('Play error even after clearing stopping head', error)
        }
      } else {
        this.log.warn('Play error', e)
      }
    }
  }

  async stop(): Promise<void> {
    try {
      this.log.info('--------- STOPPING ---------')
      this.playPipelineHeadOutput = undefined
      await this.playPipelineHead?.clear()
  
      this.clearPipelineTail()
      this.log.info('--------- STOPPED ---------')
    } catch (error) {
      this.log.warn('An error occurred when stopping', error)
    }
  }

  setAudioTrack(_: IpcMainEvent, pid: number): void {
    this.playPipelineTail?.setAudioTrackFromPid(pid)
  }

  setSubtitles({ sender }: IpcMainEvent, { audioPid, subtitlesPid }: SubtitlesProps): void {
    if (!this.playPipelineHeadOutput) {
      return
    }
    this.log.info('--------- SETTING SUBTITLE PID', subtitlesPid, '---------')
    try {
      if (this.playPipelineTail === this.transmuxer) {
        // Switch to FFMPEG
        this.clearPipelineTail()
        this.plugPipelineTail({ sender, audioPid, subtitlesPid, pipelineHeadOutput: this.playPipelineHeadOutput })
      } else if (this.playPipelineTail === this.ffmpegWrapper) {
        this.ffmpegWrapper.setSubtitlesFromPid(subtitlesPid)
      }
    } catch (error) {
      this.log.warn('An error occurred when setting the subtitles', error)
    }
  }

  /* Should be implemented in FLOW-5509 Bedside FlowR v5 | Barco | Play/Pause*/
  async pause(): Promise<void> {
    await this.playPipelineHead.pause()
    this.playPipelineTail?.pause()
  }

  async resume(): Promise<void> {
    await this.playPipelineHead.resume()
    this.playPipelineTail?.resume()
  }

  async backToLive(): Promise<void> {
    await this.playPipelineHead.backToLive()
  }
}
