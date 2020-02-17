import { writeFileSync, ensureFileSync, readFileSync, readFile, writeFile } from 'fs-extra'
import * as deepExtend from 'deep-extend'
import { DEFAULT_FRONTEND_STORE } from '..'
const path = require('path')

export async function initConfigData(configPath: string, previousData: object): Promise<void> {
  let storedData = {}

  try {
    const storedDataString = await readFile(configPath, 'utf8')
    storedData = JSON.parse(storedDataString)
  } catch (e) {
    if (e.code === 'ENOENT') {
      storedData = previousData
    }
  }
  try {
    const updatedData = deepExtend({}, DEFAULT_FRONTEND_STORE, storedData)
    await writeFile(configPath, JSON.stringify(updatedData), { encoding: 'utf8' })
  } catch (e) {
    console.error('Failed to initialize store', e)
  }
}

interface StoreConstructor {
  new (storeDir: string, opts: any): Store
}

export interface Store {
  path: string
  data: {[key: string]: any}
  get(key: string): any
  set(key: string, val: any): void
  bulkSet(data: {[key: string]: any}): void
  clear(): void
}

/**
 * Manage data persistance
 * This structure of interface (StoreConstructor + Store) allows to type the constructor:
 *  https://www.typescriptlang.org/docs/handbook/interfaces.html
 * @param {String} storeDir name of the folder containing this store
 * @param {Object} opts default values to use if store is empty
 * @param {String} opts.configName name of the file containing this store
 * @param {Object} opts.defaults default values to use if store is empty
 */
const StoreImpl: StoreConstructor = class StoreImpl implements Store {
  path: string
  data: {[key: string]: any}

  private persist() {
    // Wait, I thought using the node.js' synchronous APIs was bad form?
    // We're not writing a server so there's not nearly the same IO demand on the process
    // Also if we used an async API and our app was quit before the asynchronous write had a chance to complete,
    // we might lose that data.
    try {
      writeFileSync(this.path, JSON.stringify(this.data))
    } catch (e) {
      console.error('Error persisting store', e)
    }
  }

  constructor(storeDir: string, public opts: any) {
    this.path = path.join(storeDir, `${this.opts.configName}`)
    this.data = parseDataFile(this.path, opts.defaults)
    ensureFileSync(this.path)
  }

  // This will just return the property on the `data` object
  get(key: string) {
    return this.data[key] || this.opts.defaults[key]
  }

  // ...and this will set it
  set(key: string, val: any) {
    this.data[key] = val
    this.persist()
  }

  bulkSet(data: {[key: string]: any}) {
    this.data = { ...this.data, ...data }
    this.persist()
  }

  clear() {
    this.data = {}
    this.persist()
  }
}

function parseDataFile(filePath: string, defaults: any) {
  // We'll try/catch it in case the file doesn't exist yet, which will be the case on the first application run.
  // `fs.readFileSync` will return a JSON string which we then parse into a Javascript object
  try {
    return JSON.parse(readFileSync(filePath) as any)
  } catch (error) {
    // if there was some kind of error, return the passed in defaults instead.
    return defaults
  }
}

export class StoreManager {
  path: string

  constructor(root: string) {
    this.path = root
  }

  createStore(namespace: string = 'default', defaults: {[key: string]: any} = {}): Store {
    const configName = `${namespace}.json`
    return new StoreImpl(this.path, { configName, defaults })
  }
}
