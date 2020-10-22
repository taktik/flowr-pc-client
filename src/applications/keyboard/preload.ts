import { IpcRenderer } from 'electron'

declare global {
  namespace NodeJS {
    interface Global {
      ipcRenderer: IpcRenderer
    }
  }

  interface Window {
    global: Window
  }
}

const ipcRenderer = require('electron').ipcRenderer

process.once('loaded', () => {
  window.global = window.global || (window as any)
  global.ipcRenderer = ipcRenderer
})

export {}
