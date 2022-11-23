import { ApplicationConfig, FlowrApplication } from '@taktik/flowr-common-js'
import { BrowserWindow } from 'electron'
import { FlowrWindow } from '../frontend/flowr-window'
import { Store } from '../frontend/src/store'

interface ApplicationInitConfig {
  application: FlowrApplication
  capabilities?: {[key: string]: boolean}
  config?: ApplicationConfig
}

interface ApplicationOpenConfig {
  application: FlowrApplication
  config?: {[key: string]: any}
}

interface FlowrApplicationWindow extends BrowserWindow {
  capabilities?: {[key: string]: boolean}
  props?: {[key: string]: any}
}

interface ApplicationInitializer {
  packageJSON: ApplicationConfig
  canOpen(this: void, capabilities?: {[key: string]: boolean}, props?: {[key: string]: any}): boolean
  create(this: void, options: ApplicationOptions): FlowrApplicationWindow
}

interface FlowrApplicationInitializer {
  create: (options: ApplicationOptions) => FlowrApplicationWindow
  canOpen: (capabilities?: {[key: string]: boolean}, props?: any) => boolean
  index: string
  package: ApplicationConfig
  preload?: string
  store?: Store<Record<string, any>>
  config?: {[key: string]: any}
  capabilities?: {[key: string]: boolean}
}

interface ApplicationOptions {
  config: {[key: string]: any},
  preload?: string,
  index: string,
  store?: Store<Record<string, any>>,
  capabilities?: {[key: string]: boolean},
  flowrWindow?: FlowrWindow | null,
  browserWindow?: BrowserWindow | null,
  executeOnWindows(windows: WindowTypes[], fun: (win: BrowserWindow) => void): void,
}

enum WindowTypes {
  APPLICATIONS,
  FLOWR,
  WEXOND,
}

type ApplicationInitError = {
  application: FlowrApplication
  reason: string
}

export {
  ApplicationInitConfig,
  ApplicationInitError,
  ApplicationInitializer,
  ApplicationOpenConfig,
  ApplicationOptions,
  FlowrApplicationInitializer,
  FlowrApplicationWindow,
  WindowTypes,
}
