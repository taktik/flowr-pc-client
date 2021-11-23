import { IPlayerStore } from './playerStore'

interface IFlowrDesktopConfigWindowDimensions {
  width?: number | null,
  height?: number | null
}

interface IFlowrDesktopConfigUserPreferences {
  isMaximized?: boolean | null
  clearAppDataOnStart?: boolean | null
  extUrl?: string | null,
  isKiosk?: boolean | null
  deinterlacing?: boolean | null
  logLevel?: string | null
  windowBounds?: IFlowrDesktopConfigWindowDimensions
}

export interface IFlowrDesktopConfig {
  userPreferences: IFlowrDesktopConfigUserPreferences
  player: IPlayerStore
}
