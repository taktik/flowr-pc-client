import { FfmpegCommand } from 'fluent-ffmpeg'
import { Readable } from 'stream'

export interface IPlayerStreams {
  input: string | Readable
  ffmpeg: FfmpegCommand
}
