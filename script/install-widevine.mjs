/* ts-check */
import { spawn } from 'child_process'
import { stdin, stdout, stderr } from 'process'
import getElectronVersion from './electron-version.mjs'

const ELECTRON_VERSION = await getElectronVersion()

/**
 * @returns {Promise<void>}
 */
function installWidevine() {
    return new Promise((resolve, reject) => {
        const command = spawn('npm' ,
            [
                'install',
                `https://github.com/castlabs/electron-releases#v${ELECTRON_VERSION}+wvcus`,
                '--no-save'
            ],
            {
                stdio: [stdin, stdout, stderr]
            }
        )
        command.on('error', reject)
        command.on('exit', resolve)
    })
}

await installWidevine()
