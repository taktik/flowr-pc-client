import { IFlowrConfig } from './flowrConfig'
import { IChannelData } from './channelData'
import { IPlayerStore } from './playerStore'

export interface IFlowrStore {
  windowBounds: { width: number, height: number }
  channelData: IChannelData
  isMaximized: boolean
  clearAppDataOnStart: boolean
  extUrl: string
  isKiosk: boolean
  deinterlacing: boolean
  flowrConfig?: IFlowrConfig
  player?: IPlayerStore
  useRealMacAddress?: boolean
  phoneServer?: string
  keyboardConfig: {
    keyboard: 'embedded' | 'external' | '',
    externalKeyboardURL: string,
    embeddedKeyboardLayout?: string,
  }
}
