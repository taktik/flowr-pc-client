import { observable, computed, action } from 'mobx'
import * as React from 'react'
import { ipcRenderer, IpcRendererEvent } from 'electron'
import Vibrant = require('node-vibrant/lib/index')
import store from '~/renderer/app/store'
import {
  TABS_PADDING,
  TOOLBAR_HEIGHT,
  defaultTabOptions,
  TAB_ANIMATION_DURATION,
} from '~/renderer/app/constants'
import { getColorBrightness } from '../utils'
import { makeId } from '~/shared/utils/string'
import { TabGroup } from './tab-group'

let id = 1

const isColorAcceptable = (color: string) => {
  if (store.theme['tab.allowLightBackground']) {
    return getColorBrightness(color) > 120
  }

  return getColorBrightness(color) < 170
}

export class Tab {
  @observable
  public id: number = id++

  @observable
  public isDragging = false

  @observable
  public title = 'New tab'

  @observable
  public loading = false

  @observable
  public favicon = ''

  @observable
  public tabGroupId: number

  @observable
  public width = 0

  @observable
  public background: string = store.theme.accentColor

  @observable
  public url = ''

  @observable
  private _findVisible = false

  @observable
  public findOccurrences = '0/0'

  @observable
  public findText = ''

  @observable
  public blockedAds = 0

  @computed
  public get findVisible(): boolean {
    return this._findVisible
  }

  public set findVisible(val: boolean) {
    this._findVisible = val

    if (val) {
      ipcRenderer.send('window-focus')
    }

    requestAnimationFrame(() => {
      store.tabs.updateTabsBounds(true)
      if (val && store.findInputRef.current) {
        store.findInputRef.current.focus()
      }
    })
  }

  @computed
  public get isSelected(): boolean {
    return store.tabGroups.currentGroup.selectedTabId === this.id
  }

  @computed
  public get isHovered(): boolean {
    return store.tabs.hoveredTabId === this.id
  }

  @computed
  public get borderVisible(): boolean {
    const tabs = this.tabGroup.tabs

    const i = tabs.indexOf(this)
    const nextTab = tabs[i + 1]

    if (
      (nextTab && (nextTab.isHovered || nextTab.isSelected)) ||
      this.isSelected ||
      this.isHovered
    ) {
      return false
    }

    return true
  }

  @computed
  public get isExpanded(): boolean {
    return this.isHovered || this.isSelected || !store.tabs.scrollable
  }

  @computed
  public get isIconSet(): boolean {
    return this.favicon !== '' || this.loading
  }

  public left = 0
  public lastUrl = ''
  public isClosing = false
  public ref = React.createRef<HTMLDivElement>()
  public lastHistoryId: string
  public hasThemeColor = false
  public webContentsId: number
  public findRequestId: number
  public removeTimeout: any
  public isWindow = false

  constructor(
    { url, active } = defaultTabOptions,
    tabGroupId: number,
    isWindow: boolean,
  ) {
    this.isWindow = isWindow
    this.tabGroupId = tabGroupId

    if (isWindow) return

    ipcRenderer.send('browserview-create', { tabId: this.id, url })

    ipcRenderer.once(`browserview-created-${this.id}`, (e: any, webContentsId: number) => {
      this.webContentsId = webContentsId
      if (active) {
        this.select()
      }
    })

    ipcRenderer.on(
      `view-url-updated-${this.id}`,
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      async (e: any, newUrl: string) => {
        let updated = null

        if (newUrl && newUrl !== this.url) {
          this.lastHistoryId = await store.history.addItem({
            title: this.title,
            url: newUrl,
            favicon: this.favicon,
            date: new Date().toString(),
          })

          updated = { url: newUrl }
        }

        if (updated) {
          this.emitOnUpdated(updated)
        }

        this.url = newUrl

        this.updateData()
      },
    )

    ipcRenderer.on(`view-title-updated-${this.id}`, (e: any, title: string) => {
      this.title = title === 'about:blank' ? 'New tab' : title
      this.updateData()
    })

    ipcRenderer.on(
      `load-commit-${this.id}`,
      (
        e: IpcRendererEvent,
        isMainFrame: boolean,
      ) => {
        if (isMainFrame) {
          this.blockedAds = 0
        }
      },
    )

    ipcRenderer.on(
      `browserview-favicon-updated-${this.id}`,
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      async (e: any, favicon: string) => {
        try {
          this.favicon = favicon

          const fav = await store.favicons.addFavicon(favicon)
          const buf = Buffer.from(fav.split('base64,')[1], 'base64')

          if (!this.hasThemeColor) {
            try {
              const palette = await Vibrant.from(buf).getPalette()

              if (!palette.Vibrant) return

              if (isColorAcceptable(palette.Vibrant.hex)) {
                this.background = palette.Vibrant.hex
              } else {
                this.background = store.theme.accentColor
              }
            } catch (error) {
              console.error('Failed to update favicon', error)
            }
          }
        } catch (error) {
          this.favicon = ''
          console.error(error)
        }
        this.updateData()
      },
    )

    ipcRenderer.on(`blocked-ad-${this.id}`, () => {
      this.blockedAds++
    })

    ipcRenderer.on(
      `browserview-theme-color-updated-${this.id}`,
      (e: any, themeColor: string) => {
        if (themeColor && isColorAcceptable(themeColor)) {
          this.background = themeColor
          this.hasThemeColor = true
        } else {
          this.background = store.theme.accentColor
          this.hasThemeColor = false
        }
      },
    )

    ipcRenderer.on(`view-loading-${this.id}`, (e: any, loading: boolean) => {
      this.loading = loading

      this.emitOnUpdated({
        status: loading ? 'loading' : 'complete',
      })
    })
  }

  @action
  public updateData(): void {
    if (this.lastHistoryId) {
      const { title, url, favicon } = this

      const item = store.history.getById(this.lastHistoryId)

      if (item) {
        item.title = title
        item.url = url
        item.favicon = favicon
      }

      store.history.db.update(
        {
          _id: this.lastHistoryId,
        },
        {
          $set: {
            title,
            url,
            favicon,
          },
        },
      )
    }
  }

  public get tabGroup(): TabGroup {
    return store.tabGroups.getGroupById(this.tabGroupId)
  }

  @action
  public unselect(): void {
    this.tabGroup.selectedTabId = undefined
  }

  @action
  public select(): void {
    if (!this.isClosing) {
      store.canToggleMenu = this.isSelected

      this.tabGroup.selectedTabId = this.id

      if (this.isWindow) {
        ipcRenderer.send('browserview-hide')
        ipcRenderer.send('select-window', this.id)
      } else {
        ipcRenderer.send('hide-window')
        ipcRenderer.send('browserview-show')
        ipcRenderer.send('browserview-select', this.id)

        store.tabs.emitEvent('onActivated', {
          tabId: this.id,
          windowId: 0,
        })
      }

      requestAnimationFrame(() => {
        store.tabs.updateTabsBounds(true)
      })
    }
  }

  public getWidth(containerWidth: number = null, tabs: Tab[] = null): number {
    if (containerWidth === null) {
      containerWidth = store.tabs.containerWidth
    }

    if (tabs === null) {
      tabs = store.tabs.list.filter(
        x => x.tabGroupId === this.tabGroupId && !x.isClosing,
      )
    }

    const width =
      containerWidth / (tabs.length + store.tabs.removedTabs) - TABS_PADDING

    if (width > 200) {
      return 200
    }
    if (width < 72) {
      return 72
    }

    return width
  }

  public getLeft(calcNewLeft = false): number {
    const tabs = this.tabGroup.tabs.slice()

    const index = tabs.indexOf(this)

    let left = 0
    for (let i = 0; i < index; i++) {
      left += (calcNewLeft ? this.getWidth() : tabs[i].width) + TABS_PADDING
    }

    return left
  }

  @action
  public setLeft(left: number, animation: boolean): void {
    store.tabs.animateProperty('x', this.ref.current, left, animation)
    this.left = left
  }

  @action
  public setWidth(width: number, animation: boolean): void {
    store.tabs.animateProperty('width', this.ref.current, width, animation)
    this.width = width
  }

  @action
  public close(): void {
    const tabGroup = this.tabGroup
    const { tabs } = tabGroup

    store.tabs.closedUrl = this.url

    const selected = tabGroup.selectedTabId === this.id

    if (this.isWindow) {
      ipcRenderer.send('detach-window', this.id)
    } else {
      ipcRenderer.send('browserview-destroy', this.id)
    }

    const notClosingTabs = tabs.filter(x => !x.isClosing)
    let index = notClosingTabs.indexOf(this)

    store.tabs.resetRearrangeTabsTimer()

    this.isClosing = true
    if (notClosingTabs.length - 1 === index) {
      const previousTab = tabs[index - 1]
      if (previousTab) {
        this.setLeft(previousTab.getLeft(true) + this.getWidth(), true)
      }
      store.tabs.updateTabsBounds(true)
    } else {
      store.tabs.removedTabs++
    }

    this.setWidth(0, true)
    store.tabs.setTabsLefts(true)

    if (selected) {
      index = tabs.indexOf(this)

      if (
        index + 1 < tabs.length &&
        !tabs[index + 1].isClosing &&
        !store.tabs.scrollable
      ) {
        const nextTab = tabs[index + 1]
        nextTab.select()
      } else if (index - 1 >= 0 && !tabs[index - 1].isClosing) {
        const prevTab = tabs[index - 1]
        prevTab.select()
      }
    }

    if (this.tabGroup.tabs.length === 1) {
      store.overlay.isNewTab = true
      store.overlay.visible = true
    }

    this.removeTimeout = setTimeout(() => {
      store.tabs.removeTab(this.id)
    }, TAB_ANIMATION_DURATION * 1000)
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  public emitOnUpdated = (data: any): void => {
    store.tabs.emitEvent('onUpdated', this.id, data, this.getApiTab())
  }

  callViewMethod = (scope: string, ...args: any[]): Promise<any> => {
    return new Promise(resolve => {
      const callId = makeId(32)
      ipcRenderer.send('browserview-call', {
        args,
        scope,
        tabId: this.id,
        callId,
      })

      ipcRenderer.once(
        `browserview-call-result-${callId}`,
        (e: any, result: any) => {
          resolve(result)
        },
      )
    })
  }

  public getApiTab(): chrome.tabs.Tab {
    const selected = this.isSelected

    return {
      id: this.id,
      index: this.tabGroup.tabs.indexOf(this),
      title: this.title,
      pinned: false,
      favIconUrl: this.favicon,
      url: this.url,
      status: this.loading ? 'loading' : 'complete',
      width: this.width,
      height: TOOLBAR_HEIGHT,
      active: selected,
      highlighted: selected,
      selected,
      windowId: 0,
      discarded: false,
      incognito: false,
      autoDiscardable: false,
    }
  }
}
