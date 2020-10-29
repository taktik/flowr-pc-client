import { IpcRenderer } from 'electron'
import { ACTIVITY_EVENT } from './utils'

export function setupInactivityListeners(ipcRenderer: IpcRenderer) {
  const timeoutResetterEvents = [
    'click',
    'touchstart',
    'touchmove',
    'touchend',
    'keyup',
    'keydown',
  ]
  timeoutResetterEvents.forEach(
    (event) => {
      document.addEventListener(event, () => {
        console.log('CAUGHT AN EVENT, SENDING', ACTIVITY_EVENT)
        ipcRenderer.send(ACTIVITY_EVENT)
      }, true)
    },
  )
}
