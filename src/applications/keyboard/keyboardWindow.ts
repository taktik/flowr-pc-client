import { BrowserWindow, ipcMain, IpcMainEvent, KeyboardInputEvent, screen, Rectangle } from 'electron'
import { buildApplicationPreloadPath, buildFileUrl } from '../../application-manager/helpers'

function buildPositionFromParents(parentRectangle: Rectangle): Rectangle {
  const { width } = screen.getPrimaryDisplay().workAreaSize
  const w = Math.round(.6 * width)
  const h = Math.round(w / 3)
  return {
    width: w,
    height: h,
    x: Math.round(.2 * width),
    y: Math.round(parentRectangle.y + parentRectangle.height - h),
  }
}

export class KeyboardWindow extends BrowserWindow {
  capsLock: boolean = false

  constructor(private parent: BrowserWindow) {
    super({
      parent,
      acceptFirstMouse: true,
      alwaysOnTop: true,
      focusable: false,
      frame: false,
      maximizable: false,
      minimizable: false,
      transparent: true,
      resizable: false,
      webPreferences: {
        preload: buildApplicationPreloadPath('keyboard'),
      },
      ...buildPositionFromParents(parent.getBounds()),
    })
    const url = buildFileUrl('keyboard')
    this.loadURL(url)

    const ipcEvents = {
      keyPress: this.onKeyPress.bind(this),
      keyUp: this.onKeyUp.bind(this),
    }
    Object.entries(ipcEvents).forEach(event => ipcMain.on(...event))
    this.on('close', () => Object.entries(ipcEvents).forEach(event => ipcMain.removeListener(...event)))
  }

  private makeEvent(type: 'keyDown' | 'keyUp' | 'char', keyCode: string): KeyboardInputEvent {
    return {
      modifiers: [],
      type,
      keyCode,
    }
  }

  onKeyPress(_: IpcMainEvent, keyCode: string): void {
    const keyDown = this.makeEvent('keyDown', keyCode)
    const char = this.makeEvent('char', keyCode)
    this.parent.webContents.sendInputEvent(keyDown)
    this.parent.webContents.sendInputEvent(char)
  }

  onKeyUp(_: IpcMainEvent, keyCode: string): void {
    const keyUp = this.makeEvent('keyUp', keyCode)
    this.parent.webContents.sendInputEvent(keyUp)
  }
}
