import { ReadMode } from '@taktik/buffers'

export interface IStreamerConfig {
  capacity: number
  maxCapacity?: number
  readMode: ReadMode
  sendInterval: number
}
