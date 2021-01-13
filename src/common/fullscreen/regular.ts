import { BrowserWindow } from 'electron'
import { IFullScreenManager } from './IFullscreenManager'

export class RegularFullScreen implements IFullScreenManager {
  shouldBeDefaultFullScreen: true
  fullscreenable: true

  applyDefaultActionOnWindow(browserWindow: BrowserWindow): void {
    /* do nothing, fullscreen is the default */
  }

  isFullScreen(browserWindow: BrowserWindow): boolean {
    return browserWindow.isFullScreen()
  }

  setFullScreen(browserWindow: BrowserWindow, flag: boolean): void {
    browserWindow.setFullScreen(flag)
  }
}
