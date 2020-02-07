import { IPlayerStore } from './interfaces/playerStore'

export const DEFAULT_PLAYER_STORE: IPlayerStore = {
  ffmpegChunker: {
    chunkSize: 700e3, // size of the chunks to send through ffmpeg pipe
    leftoversConfig: { allocatedMemory: 10e6 },
    poolConfig: { allocatedMemory: 10e6 },
  },
  streamer: {
    capacity: 300000, // base streamer capacity, keep small for low definition content
    maxCapacity: 8000000, // max expansion value for buffer, useful for HD content
    poolConfig: { poolSize: 5 },
    sendInterval: 300, // to increase on "BUFFER ERROR" in flowr
  },
  decryption: { use: false }, // whether to use ts-decryptor
  tsDecryptor: {
    alignConfig: {
      capacity: 10e3, // must be superior or equal to UdpStreamer's capacity
      maxCapacity: 50e6, // must be superior or equal to UdpStreamer's maxCapacity
      poolConfig: { poolSize: 100 }, // increase this if there are alignment errors
    },
    formatterConfig: {
      leftoversConfig: { allocatedMemory: 5e6 }, // increase this if there are artefacts
      poolConfig: { allocatedMemory: 5e6 }, // increase this if there are artefacts
    },
  },
  udpStreamer: {
    allowOverwrite: true,
    capacity: 10e3, // base streaming "speed"
    maxCapacity: 50e6, // max streaming "speed", to increase on OverflowErrors
    poolConfig: { poolSize: 500 }, // per stream output, to increase on alignment errors
  },
}
