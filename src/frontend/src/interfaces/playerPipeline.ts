import { FfmpegCommand } from 'fluent-ffmpeg'
import { Writable, Readable } from 'stream'

export interface IPlayerStreams {
  input: string | Readable
  ffmpeg: FfmpegCommand
  pipeline: Writable
}
