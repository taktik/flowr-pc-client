import { app, BrowserWindow, ipcMain } from 'electron'
import { resolve, join } from 'path'
import { getLogger } from '../frontend/src/logging/loggers'

enum Protocols {
  HTTP,
  NONE,
}

const buildUrl = (protocol = Protocols.NONE): (file: string) => string => {
  return (file: string) => {
    let result: string
  
    if (protocol === Protocols.HTTP) {
      result = process.env.ENV === 'dev'
        ? `http://localhost:${__RENDERER_SERVER_PORT__}/${file}`
        : join('file://', app.getAppPath(), 'build', file)
    } else {
      result = resolve(app.getAppPath(), `build/${file}`)
    }
  
    return result
  }
}

const getApplicationFile = (file: string, protocol = Protocols.NONE) => {
  const fun = buildUrl(protocol)
  return (appName: string): string => fun(`${appName}/${file}`)
}

/**
 * Return absolute path to a given file name
 * @param {String} fileName
 */
export const buildApplicationPreloadPath = getApplicationFile('preload.js')

/**
 * Return path to given application's served file
 * @param {String} name
 */
export const getApplicationIndexUrl = getApplicationFile('index.html', Protocols.HTTP)

/**
 * Build URLs for files used by the renderers (web)
 */
export const buildFileUrl = buildUrl(Protocols.HTTP)

/**
 * Build paths for files used by the electron scripts (node)
 */
export const buildFilePath = buildUrl(Protocols.NONE)

export const monitorActivity = (browserWindow: BrowserWindow, timeout: number, callback: () => void): () => void => {
  const log = getLogger('Activity monitor')

  if (timeout === 0) {
    log.info('Activity monitor disabled (timeout value === 0)')
    return () => {
      // does nothing
    }
  }

  log.info(`Activity monitor enabled (timeout value: ${timeout}ms)`)

  const watchDogTimeout = 30000 // ping every 30 s
  let pingPingTimer: number | undefined
  let watchDogTimer: number | undefined

  const start = () => {
    pingPingTimer = setTimeout(() => {
      ipcMain.on('pong', refresh)
      browserWindow.webContents.send('ping')
      watchDogTimer = setTimeout(() => {
        callback()
        cancel()
      }, timeout)
    }, watchDogTimeout)
  }

  const cancel = () => {
    if (pingPingTimer) {
      clearTimeout(pingPingTimer)
    }
    if (watchDogTimer) {
      clearTimeout(watchDogTimer)
    }
    ipcMain.removeListener('pong', refresh)
  }

  const reset = () => {
    cancel()
    start()
  }

  const refresh = () => {
    reset()
  }

  browserWindow.on('close', cancel)
  start()

  return () => {
    cancel()
    browserWindow.off('close', cancel)
  }
}
