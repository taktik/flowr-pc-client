import { BrowserWindow } from 'electron'
export interface IFullScreenManager {
  shouldBeDefaultFullScreen: boolean
  fullscreenable: boolean
  applyDefaultActionOnWindow(browserWindow: BrowserWindow): void
  isFullScreen(browserWindow: BrowserWindow): boolean
  setFullScreen(browserWindow: BrowserWindow, flag: boolean): void
}
