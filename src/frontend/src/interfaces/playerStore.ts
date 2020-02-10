import { ITsDecryptorConfig } from '@taktik/ts-decryptor'
import { IDecryption } from './storedDecryption'
import { IStreamerConfig } from './ipcStreamerConfig'
import { ICircularBufferConfig } from '@taktik/buffers'

export interface IPlayerStore {
  decryption: IDecryption
  ffmpegChunker: IStreamerConfig
  streamer: IStreamerConfig
  tsDecryptor: ITsDecryptorConfig
  udpStreamer: ICircularBufferConfig
}
