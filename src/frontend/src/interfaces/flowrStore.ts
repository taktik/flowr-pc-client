import { FlowrConfig } from './flowrConfig'
import { IChannelData } from './channelData'
import { LogSeverity } from '../logging/types'
import { AudioStorePreferences } from './audioStore'

export interface IFlowrStore {
  windowBounds: { width: number, height: number }
  channelData: IChannelData
  isMaximized: boolean
  clearAppDataOnStart: boolean
  extUrl: string
  isKiosk: boolean
  flowrMonitoringTime?: number
  deinterlacing: boolean
  flowrConfig?: FlowrConfig
  enableVirtualKeyboard: boolean
  useRealMacAddress?: boolean
  phoneServer?: string
  messagingNumber?: string
  logLevel: LogSeverity
  audioDevices?: AudioStorePreferences
  debugMode?: boolean
}

export type ModifiableConfig = Pick<IFlowrStore, 'debugMode' |  'deinterlacing' |  'extUrl' |  'flowrMonitoringTime' |  'isKiosk' |  'clearAppDataOnStart' |  'enableVirtualKeyboard' |  'flowrConfig'>
