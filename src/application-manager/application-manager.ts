import { ApplicationConfig, FlowrApplication } from '@taktik/flowr-common-js'
import { ipcMain, WebContents, BrowserWindow, app } from 'electron'
import { resolve, join } from 'path'
import { storeManager } from '../launcher'
import { Store } from '../frontend/src/store'
import * as fs from 'fs'
import { FlowrWindow } from '../frontend/flowr-window'
import { create, packageJSON, canOpen } from '../applications/FlowrPhone'

interface ApplicationInitConfig {
  application: FlowrApplication
  capabilities?: {[key: string]: boolean}
  config?: ApplicationConfig
}

interface ApplicationCanOpenConfig {
  application: FlowrApplication
  config?: {[key: string]: any}
}

interface ApplicationOpenConfig {
  application: FlowrApplication
  config?: {[key: string]: any}
}

export interface FlowrApplicationWindow extends BrowserWindow {
  capabilities?: {[key: string]: boolean}
  props?: {[key: string]: any}
}

/**
 * Custom definition for now, from:
 * https://github.com/electron/electron/blob/master/docs/api/structures/ipc-main-event.md
 * Will be introduced in electron@6.0.0
 */
interface IpcMainEvent {
  frameId: number
  returnValue: any
  sender: WebContents
  reply: (...args: any[]) => void
}

interface ApplicationInitResults {
  initialized: FlowrApplication[],
  errors: ApplicationInitError[]
}

interface ApplicationInitError {
  application: FlowrApplication
  reason: Error
}

interface FlowrApplicationInitializer {
  create: (...args: any[]) => FlowrApplicationWindow
  canOpen: (capabilities?: {[key: string]: boolean}, props?: any) => boolean
  index: string
  package: ApplicationConfig
  preload?: string
  store?: Store
  config?: {[key: string]: any}
  capabilities?: {[key: string]: boolean}
}

export interface ApplicationOptions {
  props: {[key: string]: any},
  preload: string,
  index: string,
  store: Store,
  capabilities?: {[key: string]: boolean},
}

/**
 * Return absolute path to a given file name
 * @param {String} fileName
 */
function buildPreloadPath(fileName: string): string {
  let result: string = resolve(app.getAppPath(), `build/applications/preloads/${fileName}`)
  if (process.env.ENV !== 'dev') {
    result = join(app.getAppPath(), `/build/applications/preloads/${fileName}`)
  }
  return result
}

/**
 * Return path to given application's served file
 * @param {String} name
 */
function buildFileUrl(name: string): string {
  let result: string
  if (process.env.ENV === 'dev') {
    result = `http://localhost:4444/applications/${name}/index.html`
  } else {
    result = join('file://', app.getAppPath(), 'build', 'applications', name, 'index.html')
  }
  return result
}

export class ApplicationManager {
  private applications: {[key: string]: FlowrApplicationInitializer} = {}
  private activeWindows: {[key: string]: FlowrApplicationWindow} = {}

  // Temp properties while waiting to find a better way to handle windows
  private _flowrWindow: FlowrWindow | null = null
  get flowrWindow() {
    return this._flowrWindow
  }
  set flowrWindow(flowrWindow: FlowrWindow) {
    this._flowrWindow = flowrWindow
    flowrWindow.on('close', () => this._flowrWindow = null)
  }
  private _wexondWindow: BrowserWindow | null = null
  get wexondWindow() {
    return this._wexondWindow
  }
  set wexondWindow(wexondWindow: BrowserWindow) {
    this._wexondWindow = wexondWindow
    wexondWindow.on('close', () => this._wexondWindow = null)
  }
  // end

  constructor() {
    this.processApplicationsConfigs = this.processApplicationsConfigs.bind(this)
    this.openApplication = this.openApplication.bind(this)
    this.canOpenApplication = this.canOpenApplication.bind(this)
    ipcMain.on('initialize-applications-sync', this.processApplicationsConfigs)
    ipcMain.on('open-application', this.openApplication)
    ipcMain.on('can-open-application', this.canOpenApplication)
  }

  initLocalApps(): Promise<void[]> {
    return new Promise((resolve, reject) => {
      fs.readdir(join(app.getAppPath(), 'build', 'applications'), (err, files) => {
        if (err) {
          reject(err)
          return
        }
        const registeringPromises: Promise<void>[] = files
          // Exclude preloads folder
          .filter(name => name !== 'preloads')
          // Register applications
          .map(this.registerApp.bind(this))

        Promise.all(registeringPromises)
          .then(resolve)
          .catch(reject)
      })
    })
  }

  isRegistered(applicationTitle: string): boolean {
    return !!this.applications[applicationTitle]
  }

  async registerApp(name: string): Promise<void> {
    try {
      console.log('Registering app', name)
      // Can't easily rename fusebox output, so we'll leave the ${name}/${name} folder/file structure for now
      // const { open, packageJSON } = await import(`./applications/${name}/${name}.js`)
      // const app = (await import(`./applications/${name}/${name}-loader.js`))[name]
      // const { create, packageJSON } = app
      const preload = buildPreloadPath(name)
      const index = buildFileUrl(name)
      const store = storeManager.createStore(name)

      if (!packageJSON || !packageJSON.title) {
        throw Error('Invalid app: no title defined in app\'s package')
      }

      this.applications[packageJSON.title] = {
        create,
        package: packageJSON,
        preload,
        index,
        store,
        canOpen,
      }
      console.log('Successfully registered app', name)
    } catch (e) {
      console.error('Cannot register application:', e)
    }
  }

  unregisterApp(name: string): boolean {
    if (this.isRegistered(name)) {
      return delete this.applications[name]
    }
    console.warn(`Could not unregister application ${name}: it was not registered in the first place.`)
    return false
  }

  processApplicationsConfigs(e: IpcMainEvent, applicationConfigs: ApplicationInitConfig[]): void {
    const applicationsInit: ApplicationInitResults = applicationConfigs.reduce((statuses, applicationConfig) => {
      const applicationName = applicationConfig.application.name
      const errors = [...statuses.errors]
      const initialized = [...statuses.initialized]
      if (this.isRegistered(applicationName)) {
        this.applications[applicationName].capabilities = applicationConfig.capabilities || {}
        this.applications[applicationName].config = applicationConfig.config || {}
        initialized.push(applicationConfig.application)
      } else {
        const reason = 'Application not registered'
        errors.push({ application: applicationConfig.application, reason })
      }
      return { initialized, errors }
    }, { initialized: [], errors: [] })
    e.returnValue = applicationsInit
  }

  openApplication(e: IpcMainEvent, openConfig: ApplicationOpenConfig): void {
    let err: string | null = null

    try {
      const appName = openConfig.application ? openConfig.application.name : ''

      if (this.isRegistered(appName)) {
        const application = this.applications[appName]
        const config = openConfig.config || {}
        let applicationWindow = this.activeWindows[appName]

        if (!applicationWindow) {
          const props = Object.assign({}, application.config, config)
          applicationWindow = this.activeWindows[appName] = application.create({
            props,
            preload: application.preload,
            index: application.index,
            store: application.store,
            capabilities: application.capabilities,
            flowrWindow: this._flowrWindow,
            wexondWindow: this._wexondWindow,
          })
          applicationWindow.on('close', () => delete this.activeWindows[appName])
        } else {
          this.setProperty(applicationWindow, 'capabilities', application.capabilities)
          this.setProperties(applicationWindow, config)
        }
        if (config.show) {
          applicationWindow.show()
        }
      } else {
        if (appName) {
          err = `Cannot open application ${appName}, it is not registered.`
        } else {
          err = 'No application provided.'
        }
      }
    } catch (e) {
      console.error('Error opening app', e)
      err = e.message
    }
    e.returnValue = { err }
  }

  canOpenApplication(e: IpcMainEvent, openConfig: ApplicationCanOpenConfig) {
    const appName = openConfig.application ? openConfig.application.name : ''
    const application = this.applications[appName]
    let returnValue = false
    try {
      returnValue = !!application && application.canOpen(application.capabilities, openConfig.config)
    } catch (e) {
      console.error('Error retrieving open capabilities', e)
    }
    e.returnValue = returnValue
  }

  languageChanged(lang: string) {
    Object.values(this.activeWindows).forEach(activeWindow => {
      this.setProperty(activeWindow, 'lang', lang)
    })
  }

  setProperties(appWindow: BrowserWindow, props: {[key: string]: any}) {
    Object.entries(props).forEach(prop => {
      this.setProperty(appWindow, prop[0], prop[1])
    })
  }

  setProperty(appWindow: BrowserWindow, name: string, value: any) {
    const propertyDescriptor = Object.getOwnPropertyDescriptor(Reflect.getPrototypeOf(appWindow), name)
    if (propertyDescriptor && propertyDescriptor.set) {
      Reflect.set(appWindow, name, value)
    }
  }

  destroy(): void {
    ipcMain.removeListener('initialize-applications-sync', this.processApplicationsConfigs)
    ipcMain.removeListener('open-application', this.openApplication)
    ipcMain.removeListener('can-open-application', this.canOpenApplication)
  }

  hideAllApplications() {
    Object.values(this.activeWindows)
      .forEach(win => win.hide())
  }

  closeAllApplications() {
    Object.values(this.activeWindows)
      .forEach(win => win.close())
  }
}
