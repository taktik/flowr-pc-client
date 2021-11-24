import { ReadMode } from '@taktik/buffers'
import { app } from 'electron'
import { IPlayerStore, PipelineType, PlayerPosition } from '../interfaces/playerStore'

export const DEFAULT_PLAYER_STORE: IPlayerStore = {
  version: app.getVersion(),
  streamer: {
    capacity: 20000000, // base streamer capacity, keep small for low definition content
    maxCapacity: 30000000, // max expansion value for buffer, useful for HD content
    readMode: ReadMode.COPY,
    sendInterval: 300, // to increase on "BUFFER ERROR" in flowr
  },
  pipeline: {
    use: PipelineType.FFMPEG,
    metadata: {}
  },
  decryption: { use: false }, // whether to use ts-decryptor
  tsDecryptor: {
    alignConfig: {
      capacity: 200000000, // must be superior or equal to UdpStreamer's capacity
      maxCapacity: 200000000, // must be superior or equal to UdpStreamer's maxCapacity
      readMode: ReadMode.SLICE,
    },
    poolConfig: { allocatedMemory: 5e6 }, // increase this if there are artefacts
  },
  udpStreamer: {
    allowOverwrite: false,
    capacity: 200000000, // base streaming buffer
    maxCapacity: 200000000, // max buffer expansion size, to increase on OverflowErrors
    readMode: ReadMode.SLICE,
  },
  position: PlayerPosition.FOREGROUND
}
