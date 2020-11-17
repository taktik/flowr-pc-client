import { BrowserView, BrowserWindow, IpcMainEvent } from 'electron'
import { throttle } from 'lodash'
import { ACTIVITY_EVENT, INACTIVITY_THROTTLE } from './utils'

export async function watchForInactivity(baseWindow: BrowserWindow | BrowserView, timeoutDuration: number, callback: (baseWindow: BrowserWindow | BrowserView) => any) {
  let timeout: number | undefined = undefined

  function start() {
    timeout = setTimeout(() => callback(baseWindow), timeoutDuration * 60 * 1000)
  }

  function cancel() {
    if (timeout) {
      clearTimeout(timeout)
    }
  }

  function reset() {
    cancel()
    start()
  }

  const throttledReset = throttle(reset, INACTIVITY_THROTTLE)

  const listener = (_: IpcMainEvent, channel: string) => {
    if (channel === ACTIVITY_EVENT) {
      throttledReset()
    }
  }

  const webContents = baseWindow.webContents
  webContents.on('ipc-message', listener)
  webContents.on('before-input-event', throttledReset)
  webContents.on('destroyed', () => {
    cancel()
    webContents.removeListener('ipc-message', listener)
    webContents.removeListener('before-input-event', throttledReset)
  })

  start()

}
