import type { RegisterProps } from './views/phone'
import { PhoneWindow } from './phoneWindow'
import { FlowrWindow } from '../../frontend/flowr-window'
import { BrowserWindow, ipcMain } from 'electron'
import { ApplicationOptions } from '../../application-manager/application-manager'
import * as pkgJSON from './package.json'
import { ApplicationConfig } from '@taktik/flowr-common-js'

export type OpenPhoneProps = {
  registerProps: RegisterProps,
  history?: boolean,
  favorites?: boolean,
  currentUser?: string,
  show?: boolean,
  lang?: string,
}

interface PhoneOptions extends ApplicationOptions {
  config: OpenPhoneProps,
  flowrWindow: FlowrWindow,
  browserWindow: BrowserWindow,
}

export function create(options: PhoneOptions): PhoneWindow {
  // Most of these functions are to be moved outside...
  // ...applications should not have control over other windows, they should request it
  function mute() {
    if (options.flowrWindow) {
      muteWindow(options.flowrWindow)
    }
    if (options.browserWindow) {
      muteWindow(options.browserWindow)
    }
  }

  function unmute() {
    if (options.flowrWindow) {
      unmuteWindow(options.flowrWindow)
    }
    if (options.browserWindow) {
      unmuteWindow(options.browserWindow)
    }
  }

  function muteWindow(windowToMute: BrowserWindow) {
    if (!windowToMute.webContents.isAudioMuted()) {
      windowToMute.webContents.setAudioMuted(true)
    }
  }

  function unmuteWindow(windowToMute: BrowserWindow) {
    if (windowToMute.webContents.isAudioMuted()) {
      windowToMute.webContents.setAudioMuted(false)
    }
  }

  function keepFocus(win: BrowserWindow) {
    if (win) {
      win.on('blur', win.focus)
      win.focus()
    }
  }

  function releaseFocus(win: BrowserWindow) {
    if (win) {
      win.removeListener('blur', win.focus)
    }
  }
  const { registerProps, lang, history, favorites, currentUser } = options.config

  const phoneAppProps = {
    phoneServer: options.flowrWindow.phoneServerUrl,
    capabilities: options.capabilities,
    registerProps,
    lang,
    history,
    favorites,
    currentUser,
  }
  ipcMain.on('phone.incoming-call', (event => {
    options.flowrWindow.webContents.send('send-statistic-report', {
      type: 'counter',
      count: 1,
      name: 'flowr-desktop.phoneApp.incoming-call',
    },
      {
        type: 'counter',
        valueFieldName: 'count',
        aggregationType: 'sum',
      })
  }))
  ipcMain.on('phone.outgoing-call', (event => {
    options.flowrWindow.webContents.send('send-statistic-report', {
      type: 'counter',
      count: 1,
      name: 'flowr-desktop.phoneApp.outgoing-call',
    },
      {
        type: 'counter',
        valueFieldName: 'count',
        aggregationType: 'sum',
      })
  }))
  ipcMain.on('phone.call-ended', (event, callDuration: number, origin: 'incoming-call' | 'outgoing-call') => {
    options.flowrWindow.webContents.send('send-statistic-report', {
      type: 'timeGauge',
      value: callDuration,
      name: 'flowr-desktop.phoneApp.call-duration',
      tag: [origin],
    })
  })

  const phoneWindow = new PhoneWindow(
    options.flowrWindow,
    options.preload,
    options.index,
    phoneAppProps,
    options.store,
  )
  phoneWindow.on('show', () => {
    mute()
    keepFocus(phoneWindow)
  })
  phoneWindow.on('hide', () => {
    unmute()
    releaseFocus(phoneWindow)
  })
  phoneWindow.on('close', () => {
    unmute()
    releaseFocus(phoneWindow)
  })

  return phoneWindow
}

export const packageJSON: ApplicationConfig = pkgJSON

export function canOpen(capabilities?: {[key: string]: boolean}, props?: OpenPhoneProps) {
  const canEmit = !capabilities || capabilities.emit
  const requiredPropsAvailable = !!props &&
      !!props.registerProps &&
      !!props.registerProps.host &&
      !!props.registerProps.username
  return canEmit && requiredPropsAvailable
}
