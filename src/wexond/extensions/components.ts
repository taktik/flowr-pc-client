import { components } from 'electron'
import { getLogger } from '../../frontend/src/logging/loggers'

const log = getLogger('Components')

let initializing: Promise<void[]> | undefined

/**
 * castlab's electron-widevine provides a "component" extension
 * Only available on widevine electron, it will be undefined otherwise
 * @documentation https://github.com/castlabs/electron-releases/blob/master/docs/api/components.md
 */
declare module 'electron' {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const components: undefined | {
    whenReady(): Promise<void[]>
  }
}

export default async function initComponents(): Promise<void> {
  if (!components) {
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  if (initializing) {
    await initializing
    return
  }
  log.debug('Initializing electron components')
  try {
    await (initializing = components.whenReady())
    log.debug('Electron components have been initialized')
  } catch (error) {
    log.warn('Failed to initialize external components (probably Widevine)', error)
  }
  initializing = undefined
}
