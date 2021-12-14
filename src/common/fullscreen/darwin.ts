import { BrowserWindow } from 'electron'
import { IFullScreenManager } from './IFullscreenManager'

export class DarwinFullScreen implements IFullScreenManager{
  shouldBeDefaultFullScreen = false
  fullscreenable = false

  applyDefaultActionOnWindow(browserWindow: BrowserWindow): void {
    this.setFullScreen(browserWindow, false)
  }

  isFullScreen(browserWindow: BrowserWindow): boolean {
    return browserWindow.isMaximized()
  }

  setFullScreen(browserWindow: BrowserWindow, flag: boolean): void {
    browserWindow.setMovable(!flag)
    browserWindow.setResizable(!flag)
    browserWindow.setMinimizable(!flag)
    browserWindow.setMaximizable(true)
    if (flag) {
      browserWindow.maximize()
      browserWindow.setMaximizable(false)
    } else {
      browserWindow.unmaximize()
    }
  }
}
