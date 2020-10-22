import { app } from 'electron'
import { resolve, join } from 'path'

/**
 * Return absolute path to a given file name
 * @param {String} fileName
 */
export function buildApplicationPreloadPath(fileName: string): string {
  let result: string = resolve(app.getAppPath(), `build/${fileName}/preload`)
  if (process.env.ENV !== 'dev') {
    result = join(app.getAppPath(), `/build/${fileName}/preload`)
  }
  return result
}

  /**
   * Return path to given application's served file
   * @param {String} name
   */
export function buildFileUrl(name: string): string {
  let result: string
  if (process.env.ENV === 'dev') {
    result = `http://localhost:4444/${name}/index.html`
  } else {
    result = join('file://', app.getAppPath(), 'build', name, 'index.html')
  }
  return result
}
