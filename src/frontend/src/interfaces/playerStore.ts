import { ITsDecryptorConfig } from '@taktik/ts-decryptor'
import { IDecryption } from './storedDecryption'
import { IStreamerConfig } from './ipcStreamerConfig'
import { ICircularBufferConfig } from '@taktik/buffers'

export enum PipelineType {
  FFMPEG = 'ffmpeg',
  TRANSMUX = 'transmux',
  VLC = 'vlc',
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
    }
  }
}
