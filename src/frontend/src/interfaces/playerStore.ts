import { ITsDecryptorConfig } from '@taktik/ts-decryptor'
import { IDecryption } from './storedDecryption'
import { IStreamerConfig } from './ipcStreamerConfig'
import { ICircularBufferConfig } from '@taktik/buffers'

export enum PipelineType {
  FFMPEG = 'ffmpeg',
  TRANSMUX = 'transmux',
  VLC = 'vlc',
}

export enum PlayerPosition {
  BACKGROUND = 'BACKGROUND',
  FOREGROUND = 'FOREGROUND'
}

export interface IPlayerStore {
  version: string
  decryption: IDecryption
  streamer: IStreamerConfig
  tsDecryptor: ITsDecryptorConfig
  udpStreamer: ICircularBufferConfig
  pipeline: {
    use: PipelineType
    metadata: {
      applicationPath?: string
      keepAliveTimeout?: number
    }
  }
  position: PlayerPosition
  pause: {
    enabled: boolean
    // in seconds -> how much of the stream should be kept in memory while playing (to start back a few seconds before the stream was paused)
    liveCache: number
  }
}
