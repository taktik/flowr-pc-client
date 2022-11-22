import { WebContents } from 'electron'
import { Appender, LogMetadata } from '../../types'

export class IpcLogAppender implements Appender {
  constructor(private _webContents: WebContents) {}

  set webContents(webContents: WebContents) {
    this._webContents = webContents
  }

  log(data: LogMetadata): void {
    this._webContents.send('log', data)
  }
}
