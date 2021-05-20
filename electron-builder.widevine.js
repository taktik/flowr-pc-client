const common = require('./electron-builder.common')

module.exports = {
  ...common,
  artifactName: '${productName}-${version}-${os}-${arch}-widevine.${ext}',
  electronDownload: {
    mirror: 'https://github.com/castlabs/electron-releases/releases/download/v'
  }
}
