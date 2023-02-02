import { BrowserWindow } from 'electron'
import { IFullScreenManager } from './IFullscreenManager'

export class RegularFullScreen implements IFullScreenManager {
  shouldBeDefaultFullScreen = false
  fullscreenable = true

  applyDefaultActionOnWindow(browserWindow: BrowserWindow): void {
    this.setFullScreen(browserWindow, true)
  }

  isFullScreen(browserWindow: BrowserWindow): boolean {
    return browserWindow.isFullScreen()
  }

  setFullScreen(browserWindow: BrowserWindow, flag: boolean): void {
    browserWindow.setFullScreen(flag)
  }
}
