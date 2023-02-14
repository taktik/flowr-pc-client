import type { Readable, Writable } from 'stream'
import type { IStreamerConfig } from '../interfaces/ipcStreamerConfig'
import type FfmpegParser from './parsers/abstract'
import type { PlayerError } from './playerError'

type FfmpegParserConstructor = new (config: IStreamerConfig) => FfmpegParser

interface IFfmpegCommandWrapper {
  pipe<T extends Writable>(stream: T, options?: { end?: boolean }): T
  unpipe<T extends Writable>(stream: T): this
  kill(): void
}

type FfmpegCommandBuilder = (parserConfig: IStreamerConfig) => IFfmpegCommandWrapper

type FfmpegPipelinesParams = {
  input: Readable,
  audioPid?: number,
  subtitlesPid?: number,
  deinterlace?: boolean,
  errorHandler(error: PlayerError): void,
}

export type {
  FfmpegCommandBuilder,
  FfmpegParserConstructor,
  FfmpegPipelinesParams,
  IFfmpegCommandWrapper,
}
