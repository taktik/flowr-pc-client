import { IFlowrConfig } from './flowrConfig'
import { IChannelData } from './channelData'

export interface IFlowrStore {
  windowBounds: { width: number, height: number }
  channelData: IChannelData
  isMaximized: boolean
  clearAppDataOnStart: boolean
  extUrl: string
  isKiosk: boolean
  deinterlacing: boolean
  flowrConfig?: IFlowrConfig
  enableVirtualKeyboard: boolean
}
