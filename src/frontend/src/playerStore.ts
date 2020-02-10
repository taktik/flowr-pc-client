import { IPlayerStore } from './interfaces/playerStore'

export const DEFAULT_PLAYER_STORE: IPlayerStore = {
  ffmpegChunker: {
    capacity: 700e3, // base capacity, keep small for low definition content
    maxCapacity: 10e6, // max expansion value for buffer, useful for HD content
    poolConfig: { allocatedMemory: 10e6 },
    sendInterval: 1000, // frequency to send chunks to ffmpeg/ffprobe
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
