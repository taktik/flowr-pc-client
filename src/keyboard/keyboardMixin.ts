import { BrowserWindow, ipcMain, IpcMainEvent } from 'electron'
import { keyboard } from './keyboardController'
import { VirtualKeyboardEvent } from './events'

// tslint:disable-next-line: function-name
export function KeyboardMixin<T extends new (...args: any[]) => BrowserWindow>(baseWindow: T): T {
  return class extends baseWindow {
    constructor(...args: any[]) {
      super(...args)

      const ipcEvents = {
        [VirtualKeyboardEvent.OPEN]: (e: IpcMainEvent) => {
          if (
            e.sender === this.webContents &&
            keyboard.isEnabled &&
            this.isFocused()
          ) {
            keyboard.open(this)
          }
        },
        [VirtualKeyboardEvent.CLOSE]: (e: IpcMainEvent) => {
          if (
            e.sender === this.webContents &&
            keyboard.isEnabled &&
            this.isFocused()
          ) {
            keyboard.close()
          }
        },
        [VirtualKeyboardEvent.TOGGLE]: (e: IpcMainEvent) => {
          if (
            e.sender === this.webContents &&
            keyboard.isEnabled &&
            this.isFocused()
          ) {
            keyboard.toggle(this)
          }
        },
      }

      Object.entries(ipcEvents).forEach(event => ipcMain.on(...event))
      this.on('close', () => Object.entries(ipcEvents).forEach(event => ipcMain.removeListener(...event)))
    }
  }
}
