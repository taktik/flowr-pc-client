import { ITsDecryptorConfig, IChunkStreamConfig } from '@taktik/ts-decryptor'
import { IDecryption } from './storedDecryption'
import { IIpcStreamerConfig } from './ipcStreamerConfig'
import { ICircularBufferConfig } from '@taktik/buffers'

export interface IPlayerStore {
  decryption: IDecryption
  ffmpegChunker: IChunkStreamConfig
  ffmpegBlockSize: string
  streamer: IIpcStreamerConfig
  tsDecryptor: ITsDecryptorConfig
  udpStreamer: ICircularBufferConfig
}
