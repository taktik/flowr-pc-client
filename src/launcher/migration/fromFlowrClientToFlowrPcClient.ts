import { existsSync, readFileSync } from 'fs-extra'
import { join } from 'path'
import { app } from 'electron'
import { IFlowrStore } from '../../frontend/src/interfaces/flowrStore'

type OldMissingRootKeys = 'extUrl' | 'isKiosk'
type OldUserPreferences = Omit<IFlowrStore, OldMissingRootKeys> & { extUrl: { url: string, isKiosk: boolean } }

export function getMigrateUserPreferences(configName: string): IFlowrStore | null {
  try {
    const userDataPath: string = app.getPath('userData')
    // We'll use the `configName` property to set the file name and path.join to bring it all together as a string
    const oldPath = join(userDataPath, '../flowrclient', configName)
    if (existsSync(oldPath)) {
      const oldUserPreferences = JSON.parse(readFileSync(oldPath) as any) as OldUserPreferences
      const extUrl = oldUserPreferences.extUrl.url
      const isKiosk = oldUserPreferences.extUrl.isKiosk
      return Object.assign(oldUserPreferences, { extUrl, isKiosk })
    }
  }  catch (err) {/* silence error */}
  return null
}
