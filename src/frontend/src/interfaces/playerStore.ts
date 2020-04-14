import { ITsDecryptorConfig } from '@taktik/ts-decryptor'
import { IDecryption } from './storedDecryption'
import { IStreamerConfig } from './ipcStreamerConfig'
import { ICircularBufferConfig } from '@taktik/buffers'

export interface IPlayerStore {
  version: string
  decryption: IDecryption
  streamer: IStreamerConfig
  tsDecryptor: ITsDecryptorConfig
  udpStreamer: ICircularBufferConfig
}
