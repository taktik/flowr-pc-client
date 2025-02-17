import * as React from 'react'
import { observable } from 'mobx'

import { TabsStore } from './tabs'
import { TabGroupsStore } from './tab-groups'
import { AddTabStore } from './add-tab'
import { ipcRenderer, IpcRendererEvent } from 'electron'
import { webContents, process } from '@electron/remote'
import { OverlayStore } from './overlay'
import { HistoryStore } from './history'
import { FaviconsStore } from './favicons'
import { SuggestionsStore } from './suggestions'
import { extname } from 'path'
import { BookmarksStore } from './bookmarks'
import { readFileSync, writeFile } from 'fs'
import { getPath } from '~/shared/utils/paths/renderer'
import { Settings } from '../models/settings'
import { DownloadsStore } from './downloads'
import { lightTheme, darkTheme } from '~/renderer/constants/themes'
export interface StoreOptions {
  maxTab: number
}
export class Store {
  public history = new HistoryStore()
  public bookmarks = new BookmarksStore()
  public suggestions = new SuggestionsStore()
  public favicons = new FaviconsStore()
  public addTab = new AddTabStore()
  public tabGroups = new TabGroupsStore()
  public tabs: TabsStore
  public overlay = new OverlayStore()
  public downloads = new DownloadsStore()

  @observable
  public theme = lightTheme

  @observable
  public isAlwaysOnTop = false

  @observable
  public isFullscreen = false

  @observable
  public isHTMLFullscreen = false

  @observable
  public updateInfo = {
    available: false,
    version: '',
  }

  @observable
  public navigationState = {
    canGoBack: false,
    canGoForward: false,
  }

  @observable
  public settings: Settings = {
    dialType: 'top-sites',
    isDarkTheme: false,
    isShieldToggled: true,
  }

  public findInputRef = React.createRef<HTMLInputElement>()

  public canToggleMenu = false

  public mouse = {
    x: 0,
    y: 0,
  }

  constructor(options: StoreOptions) {
    this.tabs = new TabsStore(options.maxTab)
    ipcRenderer.on(
      'update-navigation-state',
      (
        e: IpcRendererEvent,
        data: { canGoBack: boolean; canGoForward: boolean },
      ) => {
        this.navigationState = data
      },
    )

    ipcRenderer.on('fullscreen', (e: any, fullscreen: boolean) => {
      this.isFullscreen = fullscreen
    })

    ipcRenderer.on('html-fullscreen', (e: any, fullscreen: boolean) => {
      this.isHTMLFullscreen = fullscreen
    })

    ipcRenderer.on(
      'update-available',
      (e: IpcRendererEvent, version: string) => {
        this.updateInfo.version = version
        this.updateInfo.available = true
      },
    )

    ipcRenderer.on(
      'api-tabs-query',
      (e: IpcRendererEvent, webContentsId: number) => {
        const sender = webContents.fromId(webContentsId)

        sender.send(
          'api-tabs-query',
          this.tabs.list.map(tab => tab.getApiTab()),
        )
      },
    )

    ipcRenderer.on('find', () => {
      if (this.tabs.selectedTab) {
        this.tabs.selectedTab.findVisible = true
      }
    })

    ipcRenderer.send('update-check')

    requestAnimationFrame(() => {
      if (process.argv.length > 1 && process.env.ENV !== 'dev') {
        const path = process.argv[1]
        const ext = extname(path)

        if (ext === '.html') {
          this.tabs.addTab({ url: `file:///${path}`, active: true })
        }
      }

      const param = new URLSearchParams(location.search)
      const url: string = param.get('openUrl')
      if (url) {
        this.tabs.addTab({ url: decodeURIComponent(url), active: true })
      }
    })

    let localSettingsPath = ''

    try {
      localSettingsPath = getPath('settings.json')
    } catch (e) {
      console.error(`Unable to get local settings.json path: `, e)
    }

    let localSettingsContent = ''
    try {
      localSettingsContent = readFileSync(localSettingsPath, 'utf8')
    } catch (e) {
      console.error(
        `Unable to read local settings.json from path ${localSettingsPath}: `,
        e,
      )
    }

    if (localSettingsContent) {
      try {
        const localSettings = JSON.parse(localSettingsContent) as Settings
        this.settings = { ...this.settings, ...localSettings }
      } catch (e) {
        console.error(
          `Unable to parse local settings.json from path ${localSettingsPath} and content ${localSettingsContent}`,
          e,
        )
      }
    }

    this.theme = this.settings.isDarkTheme ? darkTheme : lightTheme
    ipcRenderer.send('settings', { ...this.settings })
  }

  public saveSettings(): void {
    ipcRenderer.send('settings', { ...this.settings })

    writeFile(getPath('settings.json'), JSON.stringify(this.settings), err => {
      if (err) console.error(err)
    })
  }
}

const param = new URLSearchParams(location.search)
let maxTab = 20

if (param.has('disableTabs')) {
  maxTab = 1
} else if (param.has('maxTab')) {
  maxTab = Number(decodeURIComponent(param.get('maxTab')))
}

export default new Store({ maxTab })
