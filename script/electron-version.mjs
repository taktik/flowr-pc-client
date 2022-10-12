/* ts-check */
import { exec } from 'child_process'

/**
 * @returns {Promise<string>}
 */
function findInstalledElectron() {
    return new Promise((resolve, reject) => {
        exec('npm list --depth=0 electron', (error, out) => {
            if (error) {
                reject(error)
                return
            }
            resolve(out)
        })
    })
}

/**
 * @param {string} listOut 
 * @returns {string}
 */
function extractVersion(listOut) {
    const reg = /electron@([0-9.]+)[a-z0-9+-]*\s/m
    const extracted = reg.exec(listOut)

    if (!extracted) {
        throw Error('Failed to extract electron version, is the dependency installed ?')
    }

    return extracted[1]
}

/**
 * @returns {Promise<string>}
 */
export default async function getElectronVersion() {
    const installed = await findInstalledElectron()
    return extractVersion(installed)
}
