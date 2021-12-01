import { session } from 'electron'
import { getLogger } from '../../frontend/src/logging/loggers'

const log = getLogger('Browsing data')

export const clearBrowsingData = async (): Promise<void> => {
  log.info('clear browsing data')
  const ses = session.fromPartition('persist:view')
  try {
    await ses.clearCache()
    await ses.clearStorageData({
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
  } catch (err) {
    log.error(err)
  }
}
