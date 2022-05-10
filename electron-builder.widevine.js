/* eslint-disable */

const common = require('./electron-builder.common')
const { exec } = require('child_process')

function signIf(targetPlatform) {
  return ({ appOutDir, electronPlatformName }) => {
    if (electronPlatformName !== targetPlatform) {
      return
    }

    return new Promise((resolve, reject) => {
      exec(`${process.env.PYTHON3} -m castlabs_evs.vmp sign-pkg ${appOutDir}`, (err) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  }
}

module.exports = {
  ...common,
  artifactName: '${productName}-${version}-${os}-${arch}-widevine.${ext}',
  afterPack: signIf('darwin'),
  afterSign: signIf('win32'),
  electronVersion: '17.4.3',
  electronDownload: {
    version: '17.4.3+wvcus',
    mirror: 'https://github.com/castlabs/electron-releases/releases/download/v'
  }
}
