import { IpcRenderer } from 'electron'
import { VirtualKeyboardEvent } from './events'

// tslint:disable-next-line: function-name
export function KeyboardOpener<T extends new (...args: any[]) => {}>(yo: T) {
  return class extends yo {
    ipc: IpcRenderer = window.ipcRenderer

    openKeyboard() {
      this.ipc.send(VirtualKeyboardEvent.OPEN)
    }

    closeKeyboard() {
      this.ipc.send(VirtualKeyboardEvent.CLOSE)
    }

    toggleKeyboard() {
      this.ipc.send(VirtualKeyboardEvent.TOGGLE)
    }
  }
}
