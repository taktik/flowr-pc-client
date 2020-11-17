import { app } from 'electron'
import { join, resolve } from 'path'

export function buildPreloadPath(fileName: string): string {
  let result: string = resolve(app.getAppPath(), `build/${fileName}`)
  if (process.env.ENV !== 'dev') {
    result = join(app.getAppPath(), `/build/${fileName}`)
  }
  return result
}
