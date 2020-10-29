import { BrowserWindow, IpcMainEvent } from 'electron'
import { ACTIVITY_EVENT } from './utils'

export function watchForInactivity(baseWindow: BrowserWindow, timeoutDuration: number, callback: () => any) {
  let timeout: number | undefined = undefined

  function start() {
    timeout = setTimeout(callback, timeoutDuration)
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

  const listener = (_: IpcMainEvent, channel: string) => {
    console.log('IPC MESSAGE', channel)
    if (channel === ACTIVITY_EVENT) {
      console.log('YOYOYOYOYOYOYOYOOYOYOYOYOYYOOYYOYO')
      reset()
    }
  }

  const webContents = baseWindow.webContents
  webContents.on('ipc-message', listener)
  webContents.on('destroyed', () => webContents.removeAllListeners('ipc-message'))
}
