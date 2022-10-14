/* ts-check */
import { cp } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import getElectronVersion from './electron-version.mjs'

const ELECTRON_VERSION = await getElectronVersion()

/**
 * @returns {Promise<void>}
 */
async function copyHeaders() {
    const origin = join(homedir(), '.electron-gyp', ELECTRON_VERSION)
    const dest =`${origin}+wvcus`
    await cp(origin, dest, { recursive: true })
}

await copyHeaders()
