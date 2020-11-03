import { IpcRenderer } from 'electron'
import { throttle } from 'lodash'
import { ACTIVITY_EVENT } from './utils'

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

  const send = throttle(() => ipcRenderer.send(ACTIVITY_EVENT), 10000)

  timeoutResetterEvents.forEach(
    (event) => window.addEventListener(event, send, true),
  )
}
