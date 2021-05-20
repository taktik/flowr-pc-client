import { Store } from './src/store'
import { BrowserWindowConstructorOptions } from 'electron'
import { IFlowrStore } from './src/interfaces/flowrStore'
import { FullScreenManager } from '../common/fullscreen'

export default function (flowrStore: Store<IFlowrStore>): BrowserWindowConstructorOptions {
  const kiosk = flowrStore.get('isKiosk') || false
  const winBounds = flowrStore.get('windowBounds')
  // Create the browser window.
  return {
    width: winBounds.width, // 1280,
    height: winBounds.height + 40, // 720, ??
    minWidth: 430,
    minHeight: 270,
    title: 'FlowR',
    fullscreen: FullScreenManager.shouldBeDefaultFullScreen,
    fullscreenable: FullScreenManager.fullscreenable,
    kiosk,
    titleBarStyle: 'hiddenInset',
    alwaysOnTop: false,
  }
}
