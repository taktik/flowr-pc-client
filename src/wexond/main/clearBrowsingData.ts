import { session } from 'electron'

export const clearBrowsingData = async () => {
  console.log('----------- clearBrowsingData ----------------')
  const ses = session.fromPartition('persist:view')
  try {
    await ses.clearCache()
  } catch (err) {
    console.error(err)
  }

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
