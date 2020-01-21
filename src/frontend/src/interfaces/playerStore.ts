import { ITsDecryptorConfig } from '@taktik/ts-decryptor'
import { IUdpStreamerConfig } from '@taktik/udp-streamer'
import { IDecryption } from './storedDecryption'
import { IIpcStreamerConfig } from './ipcStreamerConfig'

export interface IPlayerStore {
  streamer: IIpcStreamerConfig
  decryption: IDecryption
  tsDecryptor: ITsDecryptorConfig
  udpStreamer: IUdpStreamerConfig
}
