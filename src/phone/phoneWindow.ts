import { BrowserWindow, Rectangle, app, ipcMain } from 'electron'
import { resolve, join } from 'path';
import { WindowModes } from './WindowModes'

function buildFileUrl(fileName: string): string {
  let result: string
  if (process.env.ENV === 'dev') {
    result = `http://localhost:4444/${fileName}`;
  } else {
    result = join('file://', app.getAppPath(), 'build', fileName)
  }
  return result
}

function buildExportPath(fileName: string): string {
  let result: string = resolve(app.getAppPath(), `build/${fileName}`)
  if (process.env.ENV !== 'dev') {
    result = join(app.getAppPath(), `/build/${fileName}`)
  }
  return result
}

export class PhoneWindow extends BrowserWindow {
  _mode: WindowModes
  _username: string

  get _widgetPosition(): Rectangle {
    const contentBounds = this.getContentBounds()
    return {
      width: 400,
      height: 200,
      x: Math.max(contentBounds.width - 400, 0),
      y: 0,
    }
  }

  get mode() {
    return this._mode
  }

  set mode(value: WindowModes) {
    this._mode = value
    if (value === WindowModes.WIDGET) {
      this.setBounds(this._widgetPosition, true)
    } else {
      this.maximize()
    }
    this.webContents.send('window-mode-changed', value)
  }

  set username(value: string) {
    if (this._username !== value) {
      this.webContents.send('username-changed', value)
      this._username = value
    }
  }

  constructor(parent: BrowserWindow, phoneServer: string, username?: string) {
    super({
      frame: false,
      show: false,
      parent,
      modal: true,
      webPreferences: {
        plugins: true,
        nodeIntegration: false,
        contextIsolation: false,
        experimentalFeatures: true,
        preload: buildExportPath('phonePreload'),
      },
    })
    this.mode = WindowModes.WIDGET
    this.loadURL(buildFileUrl(`phone.html?server=${phoneServer}&username=${username}`))
    ipcMain.on('phone-maximize', () => this.mode = WindowModes.FULLSCREEN)
    ipcMain.on('phone-reduce', () => this.mode = WindowModes.WIDGET)
  }

  open(mode: WindowModes = WindowModes.WIDGET) {
    this.mode = mode
    this.show()
  }
}
