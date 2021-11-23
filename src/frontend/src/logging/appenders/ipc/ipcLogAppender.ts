import { WebContents } from 'electron'
import { Appender, LogMetadata } from '../../types'

export class IpcLogAppender implements Appender {
  constructor(private readonly webContents: WebContents) {}

  log(data: LogMetadata): void {
    this.webContents.send('log', data)
  }
}
