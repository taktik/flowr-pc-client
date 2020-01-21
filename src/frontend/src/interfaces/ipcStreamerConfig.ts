import { IBufferPoolConfig } from '@taktik/buffers/dist/interfaces/bufferPoolConfig'

export interface IIpcStreamerConfig {
  chunkSize: number
  poolConfig: Partial<IBufferPoolConfig>
}
