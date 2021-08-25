import { WebContents } from 'electron'
import { ConsoleAppender } from './logging/appenders/console/consoleAppender'
import { IpcLogAppender } from './logging/appenders/ipc/ipcLogAppender'
import { addAppender } from './logging/loggers'

export function initializeLogging(webContents: WebContents) {
  const ipcAppender = new IpcLogAppender(webContents)
  const consoleAppender = new ConsoleAppender()

  addAppender(ipcAppender)
  addAppender(consoleAppender)
}
