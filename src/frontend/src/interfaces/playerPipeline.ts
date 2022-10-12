import { FfmpegCommand } from '@taktik/fluent-ffmpeg'
import { WebContents } from 'electron'
import { Readable } from 'stream'

export interface IPlayerStreams {
  input: string | Readable
  ffmpeg: FfmpegCommand
}

export interface IPipelineTail {
  sender?: WebContents

  play(input: Readable, audioPid?: number, subtitlesPid?: number): void
  clear(): void
  setAudioTrackFromPid(pid: number): void
  setSubtitlesFromPid?(pid: number): void
}

export type PipelineTailConfig = {
  sender: WebContents
  pipelineHeadOutput: Readable
  audioPid: number | undefined
  subtitlesPid: number | undefined
}
