import { IpcRenderer } from 'electron';

declare global {
  namespace NodeJS {
    interface Global {
      require: any
      ipcRenderer: IpcRenderer
    }
  }
}

const nodeRequire: {[key: string]: any} = {
  react: require('react'),
  'react-dom': require('react-dom'),
  'typescript-state-machine': require('typescript-state-machine'),
}
const ipcRenderer = require('electron').ipcRenderer

process.once('loaded', () => {
  global.require = (moduleName: string): any => {
    const requiredModule = nodeRequire[moduleName]

    if (!requiredModule) {
      throw Error(`Cannot find module ${moduleName}. It must be explicitely exported from the preload script.`)
    }

    return requiredModule
  }
  global.ipcRenderer = ipcRenderer
});

export {};
