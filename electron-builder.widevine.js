const common = require('./electron-builder.common')

module.exports = {
  ...common,
  artifactName: '${productName}-${version}-widevine.${ext}',
  electronDownload: {
    mirror: 'https://github.com/castlabs/electron-releases/releases/download/v'
  }
}
