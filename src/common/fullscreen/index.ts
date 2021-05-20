import { platform } from 'os'
import { BrowserWindow } from 'electron'
import { DarwinFullScreen } from './darwin'
import { RegularFullScreen } from './regular'
import { IFullScreenManager } from './IFullscreenManager'

function applyMaximizeTransform(browserWindow: BrowserWindow, transform: () => void) {
  const isMaximizable = browserWindow.isMaximizable()
  if (!isMaximizable) {
    browserWindow.setMaximizable(true)
  }
  transform.call(browserWindow)
  if (!isMaximizable) {
    browserWindow.setMaximizable(false)
  }
}

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
    if (this.isFullScreen(source)) {
      this.setFullScreen(target, true)
    } else if (source.isMaximized()) {
      applyMaximizeTransform(target, target.maximize)
    } else {
      if (target.isMaximized()) {
        applyMaximizeTransform(target, target.unmaximize)
      }
      target.setBounds(source.getBounds())
    }
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
