import { IpcRenderer } from 'electron'
import { throttle } from 'lodash'
import { ACTIVITY_EVENT, INACTIVITY_THROTTLE } from './utils'

export function setupInactivityListeners(ipcRenderer: IpcRenderer) {
  const timeoutResetterEvents = [
    'click',
    'mousemove',
    'mouseup',
    'mousedown',
    'touchstart',
    'touchmove',
    'touchend',
    'keyup',
    'keydown',
    'scroll',
  ]

  const send = throttle(() => ipcRenderer.send(ACTIVITY_EVENT), INACTIVITY_THROTTLE)

  timeoutResetterEvents.forEach(
    (event) => window.addEventListener(event, send, true),
  )
}
