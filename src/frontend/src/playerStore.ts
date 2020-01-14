import { IPlayerStore } from './interfaces/playerStore'

const CHUNK_SIZE = 940000

export const DEFAULT_PLAYER_STORE: IPlayerStore = {
  chunker: {
    chunkSize: CHUNK_SIZE, // size of the packets sent to the webpage, increase on buffer errors
    leftoversMemory: 10 * CHUNK_SIZE,
    poolMemory: 3 * CHUNK_SIZE,
  },
  decryption: { use: false }, // whether to use ts-decryptor
  tsDecryptor: {
    alignMemoryAllocation: {
      capacity: 10e3, // must be superior or equal to UdpStreamer's writeableHighWatermark
      pool: 5e6, // increase this if there are artefacts
    },
    formatterMemoryAllocation: {
      leftovers: 5e6, // increase this if there are artefacts
      pool: 5e6, // increase this if there are artefacts
    },
  },
  udpStreamer: {
    outputMemoryAllocation: 5e6, // per stream output
    writeableHighWatermark: 5e3, // streaming "speed"
  },
}
