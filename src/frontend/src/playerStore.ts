import { IPlayerStore } from './interfaces/playerStore'

const CHUNK_SIZE = 188000

export const DEFAULT_PLAYER_STORE: IPlayerStore = {
  streamer: {
    chunkSize: CHUNK_SIZE,
    poolConfig: { poolSize: 10 },
  },
  decryption: { use: false }, // whether to use ts-decryptor
  tsDecryptor: {
    alignMemoryAllocation: {
      capacity: 10e3, // must be superior or equal to UdpStreamer's writeableHighWatermark
      pool: 50e6, // increase this if there are alignment errors
    },
    formatterMemoryAllocation: {
      leftovers: 5e6, // increase this if there are artefacts
      pool: 5e6, // increase this if there are artefacts
    },
  },
  udpStreamer: {
    outputMemoryAllocation: 200e6, // per stream output, to increase on alignment errors
    writeableHighWatermark: 5e3, // streaming "speed"
  },
}
