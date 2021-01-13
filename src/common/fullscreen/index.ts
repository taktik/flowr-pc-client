import { platform } from 'os'
import { BrowserWindow } from 'electron'
import { DarwinFullScreen } from './darwin'
import { RegularFullScreen } from './regular'
import { IFullScreenManager } from './IFullscreenManager'

class FullScreen implements IFullScreenManager {
  private handler = this.buildFullScreenHandler()

  private buildFullScreenHandler(): IFullScreenManager {
    switch (platform()) {
      case 'darwin': return new DarwinFullScreen()
      default: return new RegularFullScreen()
    }
  }

  shouldBeDefaultFullScreen = this.handler.shouldBeDefaultFullScreen
  fullscreenable = this.handler.fullscreenable

  applySameWindowState(source: BrowserWindow, target: BrowserWindow) {
    this.setFullScreen(target, this.isFullScreen(source))
  }

  applyDefaultActionOnWindow(browserWindow: BrowserWindow): void {
    this.handler.applyDefaultActionOnWindow(browserWindow)
  }

  isFullScreen(browserWindow: BrowserWindow): boolean {
    return this.handler.isFullScreen(browserWindow)
  }

  setFullScreen(browserWindow: BrowserWindow, flag: boolean): void {
    this.handler.setFullScreen(browserWindow, flag)
  }
}

export const FullScreenManager = new FullScreen()
