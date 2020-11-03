import { BrowserView, BrowserWindow, IpcMainEvent, WebContents } from 'electron'
import { ACTIVITY_EVENT } from './utils'

const DOM_READY_TIMEOUT = 10000 // 10s

function waitForDomReady(webContents: WebContents) {
  return new Promise((resolve, reject) => {
    function done() {
      clearTimeout(timeout)
      resolve()
    }
    const timeout = setTimeout(() => {
      webContents.removeListener('dom-ready', done)
      reject(Error(`"dom-ready" event took too long to fire (more than ${DOM_READY_TIMEOUT / 1000}s)`))
    }, DOM_READY_TIMEOUT)
    webContents.once('dom-ready', done)
  })
}

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

  const listener = (_: IpcMainEvent, channel: string) => {
    if (channel === ACTIVITY_EVENT) {
      reset()
    }
  }

  const webContents = baseWindow.webContents
  webContents.on('ipc-message', listener)
  webContents.on('before-input-event', reset)
  webContents.on('destroyed', () => {
    cancel()
    webContents.removeListener('ipc-message', listener)
    webContents.removeListener('before-input-event', reset)
  })

  // await waitForDomReady(webContents)

  // await webContents.executeJavaScript(`
  //   if (!window.ipcRenderer) {
  //     throw Error('"ipcRenderer" variable must be globally available for inactivity to work. Either use { nodeIntegration: true } when creating the window (not recommended) or a preload script.')
  //   }
  //   const timeoutResetterEvents = [
  //     'click',
  //     'touchstart',
  //     'touchmove',
  //     'touchend',
  //     'keyup',
  //     'keydown',
  //     'scroll',
  //   ]
  //   timeoutResetterEvents.forEach(
  //     (event) => {
  //       window.addEventListener(event, () => {
  //         window.ipcRenderer.send('${ACTIVITY_EVENT}')
  //       }, true)
  //     },
  //   )
  // `, false)

  start()

}
