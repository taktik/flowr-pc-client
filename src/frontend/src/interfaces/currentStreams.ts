import { IStream } from './streamTrack'

export interface ICurrentStreams {
  url: string
  video: IStream
  audio: IStream
  subtitles: IStream
}
