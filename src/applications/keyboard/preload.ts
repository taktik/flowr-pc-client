import type { IpcRenderer } from 'electron'

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
const ipcRenderer = require('electron').ipcRenderer as IpcRenderer

process.once('loaded', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  window.global = window.global || (window as any)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  ;(global as any).ipcRenderer = ipcRenderer
})
