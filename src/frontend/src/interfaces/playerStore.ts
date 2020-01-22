import { ITsDecryptorConfig, IChunkStreamConfig } from '@taktik/ts-decryptor'
import { IDecryption } from './storedDecryption'
import { IIpcStreamerConfig } from './ipcStreamerConfig'
import { ICircularBufferConfig } from '@taktik/buffers'

export interface IPlayerStore {
  decryption: IDecryption
  ffmpegChunker: IChunkStreamConfig
  streamer: IIpcStreamerConfig
  tsDecryptor: ITsDecryptorConfig
  udpStreamer: ICircularBufferConfig
}
