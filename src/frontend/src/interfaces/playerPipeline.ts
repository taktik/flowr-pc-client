import { FfmpegCommand } from 'fluent-ffmpeg'
import { Writable, Readable } from 'stream'
import { IpcStreamer } from '../ipcStreamer'

export interface IPlayerStreams {
  input: string | Readable
  ffmpeg: FfmpegCommand
  pipeline: Writable
  streamer: IpcStreamer
}
