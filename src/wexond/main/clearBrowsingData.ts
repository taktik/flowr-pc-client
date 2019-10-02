import { session } from 'electron'

export const clearBrowsingData = () => {
  console.log('----------- clearBrowsingData ----------------')
  const ses = session.fromPartition('persist:view')
  ses.clearCache((err: any) => {
    if (err) console.error(err)
  })

  ses.clearStorageData({
    storages: [
      'appcache',
      'cookies',
      'filesystem',
      'indexdb',
      'localstorage',
      'shadercache',
      'websql',
      'serviceworkers',
      'cachestorage',
    ],
  })
}
