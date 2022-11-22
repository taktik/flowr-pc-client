import { components } from 'electron'
import { getLogger } from '../../frontend/src/logging/loggers'

const log = getLogger('Components')

let initializing: Promise<void[]> | undefined

export default async function initComponents(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  if (initializing) {
    await initializing
    return
  }
  log.debug('Initializing electron components')
  try {
    await (initializing = components.whenReady())
  } catch (error) {
    log.warn('Failed to initialize external components (probably Widevine)', error)
  }
  log.debug('Electron components have been initialized')
  initializing = undefined
}
