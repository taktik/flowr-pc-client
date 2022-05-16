import { BrowserWindow, ipcMain, IpcMainEvent, KeyboardInputEvent, screen, Rectangle, WebContents } from 'electron'
import { getLogger } from '../../frontend/src/logging/loggers'
import { buildApplicationPreloadPath, getApplicationIndexUrl } from '../../application-manager/helpers'

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
  private log = getLogger('Keyboard window')
  capsLock = false

  get webContentsToSend(): WebContents | undefined {
    const browserView = this.parent?.getBrowserView()
    return browserView?.webContents ?? this.parent?.webContents
  }

  constructor(private parent?: BrowserWindow) {
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
      show: false,
      movable: true,
      webPreferences: {
        preload: buildApplicationPreloadPath('keyboard'),
      },
      ...(parent ? buildPositionFromParents(parent.getBounds()) : {}),
    })
    const url = getApplicationIndexUrl('keyboard')
    this.loadURL(url).catch(e => this.log.error('Failed to open keyboard url', url, e))

    const ipcEvents = {
      keyPress: this.onKeyPress.bind(this) as this['onKeyPress'],
      keyUp: this.onKeyUp.bind(this) as this['onKeyUp'],
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
    this.webContentsToSend?.sendInputEvent(keyDown)
    this.webContentsToSend?.sendInputEvent(char)
  }

  onKeyUp(_: IpcMainEvent, keyCode: string): void {
    const keyUp = this.makeEvent('keyUp', keyCode)
    this.webContentsToSend?.sendInputEvent(keyUp)
  }

  setParentWindow(parent: BrowserWindow | null): void {
    if (parent) {
      const { x, y, width, height } = buildPositionFromParents(parent.getBounds())
      this.setSize(width, height)
      this.setPosition(x, y)
    }
    this.parent = parent
    super.setParentWindow(parent)
  }
}
