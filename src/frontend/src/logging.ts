import { WebContents } from 'electron'
import { ConsoleAppender } from './logging/appenders/console/consoleAppender'
import { IpcLogAppender } from './logging/appenders/ipc/ipcLogAppender'
import { addAppender } from './logging/loggers'

let consoleAppenderInitialized = false
let ipcAppender: IpcLogAppender | undefined

function initializeLogging(): void {
  if (consoleAppenderInitialized) {
    return
  }
  const consoleAppender = new ConsoleAppender()
  addAppender(consoleAppender)
  consoleAppenderInitialized = true
}

function initializeIpcLogging(webContents: WebContents): void {
  if (ipcAppender) {
    ipcAppender.webContents = webContents
  } else {
    ipcAppender = new IpcLogAppender(webContents)
    addAppender(ipcAppender)
  }
}

export {
  initializeLogging,
  initializeIpcLogging,
}
