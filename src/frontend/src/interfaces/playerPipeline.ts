import { FfmpegCommand } from 'fluent-ffmpeg'
import { Readable } from 'stream'
import { IpcStreamer } from '../ipcStreamer'

export interface IPlayerStreams {
  input: string | Readable
  ffmpeg: FfmpegCommand
  streamer: IpcStreamer
}
