import type { IpcRenderer } from 'electron'
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
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const nodeRequire = {
  'react': require('react'),
  'react-dom': require('react-dom'),
  'typescript-state-machine': require('typescript-state-machine'),
  '@fortawesome/react-fontawesome': require('@fortawesome/react-fontawesome'),
  '@fortawesome/fontawesome-svg-core': require('@fortawesome/fontawesome-svg-core'),
  '@fortawesome/free-solid-svg-icons': require('@fortawesome/free-solid-svg-icons'),
  'styled-components': require('styled-components'),
  'moment': require('moment'),
}
const ipcRenderer = require('electron').ipcRenderer
/* eslint-enable @typescript-eslint/no-unsafe-assignment */

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
