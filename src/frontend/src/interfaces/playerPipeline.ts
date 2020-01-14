import { FfmpegCommand } from 'fluent-ffmpeg'
import { IpcStreamer } from '../ipcStreamer'

export interface IPlayerStreams {
  ffmpeg: FfmpegCommand
  pipeline: IpcStreamer
}
