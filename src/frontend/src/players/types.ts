import type Ffmpeg from '@taktik/fluent-ffmpeg'
import type { Readable } from 'stream'
import type { IOutputParser } from './parsers/types'
import type { PlayerError } from './playerError'

type FfmpegCommandResponse = {
    command: Ffmpeg.FfmpegCommand
    parser?: IOutputParser
}

type FfmpegPipelinesParams = {
    input: Readable,
    audioPid?: number,
    subtitlesPid?: number,
    deinterlace?: boolean,
    errorHandler(error: PlayerError): void,
  }

export type {
    FfmpegCommandResponse,
    FfmpegPipelinesParams,
}
