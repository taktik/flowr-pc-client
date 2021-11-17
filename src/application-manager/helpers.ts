import { app } from 'electron'
import { resolve, join } from 'path'

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
