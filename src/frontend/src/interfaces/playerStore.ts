import { IChunkStreamConfig, ITsDecryptorConfig } from '@taktik/ts-decryptor'
import { IUdpStreamerConfig } from '@taktik/udp-streamer'
import { IDecryption } from './storedDecryption'

export interface IPlayerStore {
  chunker: IChunkStreamConfig,
  decryption: IDecryption,
  tsDecryptor: ITsDecryptorConfig,
  udpStreamer: IUdpStreamerConfig,
}
