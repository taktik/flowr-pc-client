import { IBufferPoolConfig } from '@taktik/buffers/dist/interfaces/bufferPoolConfig'

export interface IIpcStreamerConfig {
  capacity: number
  maxCapacity: number
  poolConfig: Partial<IBufferPoolConfig>
  sendInterval: number
}
