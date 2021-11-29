import { IFlowrConfig } from './flowrConfig'
import { IChannelData } from './channelData'
import { IPlayerStore } from './playerStore'
import { LogSeverity } from '../logging/types'

export interface IFlowrStore {
  windowBounds: { width: number, height: number }
  channelData: IChannelData
  isMaximized: boolean
  clearAppDataOnStart: boolean
  extUrl: string
  isKiosk: boolean
  flowrMonitoringTime?: number
  deinterlacing: boolean
  flowrConfig?: IFlowrConfig
  player?: IPlayerStore
  enableVirtualKeyboard: boolean
  useRealMacAddress?: boolean
  phoneServer?: string
  messagingNumber?: string
  logLevel: LogSeverity
}
