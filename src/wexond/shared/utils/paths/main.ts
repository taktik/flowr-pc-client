import { resolve } from 'path'
import { app } from 'electron'

export const getPath = (...relativePaths: string[]): string => {
  const path = app.getPath('userData')
  return resolve(path, ...relativePaths).replace(/\\/g, '/')
}
