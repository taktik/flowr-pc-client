import { IpcRenderer } from 'electron'
import { VirtualKeyboardEvent } from '../../keyboard/events'

declare global {
  namespace NodeJS {
    interface Global {
      require: any
      ipcRenderer: IpcRenderer
      process: Process
      openKeyboard: () => void
      closeKeyboard: () => void
    }
  }

  interface Window {
    global: Window
  }
}

const production = process.env.NODE_ENV !== 'dev' && process.env.NODE_ENV !== 'development'
const packagesToExport = [
  'react',
  'react-dom',
  'typescript-state-machine',
  '@fortawesome/react-fontawesome',
  '@fortawesome/fontawesome-svg-core',
  '@fortawesome/free-solid-svg-icons',
  'styled-components',
  'moment',
]
const nodeRequire: {[key: string]: any} = packagesToExport.reduce((exported, pack) => Object.assign(exported, { [pack]: require(pack) }), {})
const ipcRenderer = require('electron').ipcRenderer

process.once('loaded', () => {
  window.global = window.global || (window as any)

  global.require = (moduleName: string): any => {
    const requiredModule = nodeRequire[moduleName]

    if (!requiredModule) {
      throw Error(`Cannot find module ${moduleName}. It must be explicitely exported from the preload script.`)
    }

    return requiredModule
  }
  global.ipcRenderer = ipcRenderer

  if (!production) {
    global.process = process
  }
  global.openKeyboard = () => ipcRenderer.send(VirtualKeyboardEvent.OPEN)
  global.closeKeyboard = () => ipcRenderer.send(VirtualKeyboardEvent.CLOSE)
})

export {}
