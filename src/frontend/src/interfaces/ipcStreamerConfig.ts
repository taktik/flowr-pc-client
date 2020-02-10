import { IBufferPoolConfig } from '@taktik/buffers/dist/interfaces/bufferPoolConfig'

export interface IStreamerConfig {
  capacity: number
  maxCapacity: number
  poolConfig: Partial<IBufferPoolConfig>
  sendInterval: number
}
