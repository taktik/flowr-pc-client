import { writeFileSync, ensureFileSync, readFileSync, readFile, writeFile, existsSync } from 'fs-extra'
import { join } from 'path'
import * as deepExtend from 'deep-extend'
import { DEFAULT_FRONTEND_STORE } from '..'
import { IFlowrStore } from './interfaces/flowrStore'

export async function initConfigData(configPath: string, previousData: IFlowrStore | null): Promise<void> {
  let storedData: IFlowrStore | null

  try {
    const storedDataString = await readFile(configPath, 'utf8')
    storedData = JSON.parse(storedDataString) as IFlowrStore
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
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

interface StoreOptions<T> {
  configName: string
  defaults: T
}

export interface Store<T extends Record<string, any>> {
  path: string
  data: T
  get<K extends keyof T>(key: K): T[K]
  set<K extends keyof T>(key: K, val: T[K]): void
  bulkSet(data: Partial<T>): void
  reset(data: T): void
  persist(): void
}

/**
 * Manage data persistance
 * @param {String} storeDir name of the folder containing this store
 * @param {Object} opts default values to use if store is empty
 * @param {String} opts.configName name of the file containing this store
 * @param {Object} opts.defaults default values to use if store is empty
 */
class StoreImpl<T> implements Store<T> {
  path: string
  data: T

  constructor(storeDir: string, public opts: StoreOptions<T>) {
    this.path = join(storeDir, opts.configName)
    this.data = parseDataFile(this.path, opts.defaults)
    ensureFileSync(this.path)
  }

  // This will just return the property on the `data` object
  get<K extends keyof T>(key: K): T[K] {
    return this.data[key] || this.opts.defaults[key]
  }

  // ...and this will set it
  set<K extends keyof T>(key: K, val: T[K]) {
    this.data[key] = val
    this.persist()
  }

  bulkSet(data: Partial<T>) {
    this.data = { ...this.data, ...data }
    this.persist()
  }

  reset(data: T) {
    this.data = data
    this.persist()
  }

  persist() {
    // Wait, I thought using the node.js' synchronous APIs was bad form?
    // We're not writing a server so there's not nearly the same IO demand on the process
    // Also if we used an async API and our app was quit before the asynchronous write had a chance to complete,
    // we might lose that data.
    try {
      writeFileSync(this.path, JSON.stringify(this.data, null, 2))
    } catch (e) {
      console.error('Error persisting store', e)
    }
  }
}

function parseDataFile<T>(filePath: string, defaults: T): T {
  // We'll try/catch it in case the file doesn't exist yet, which will be the case on the first application run.
  // `fs.readFileSync` will return a JSON string which we then parse into a Javascript object
  try {
    return JSON.parse(readFileSync(filePath) as any) as T
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

  exists(namespace: string): boolean {
    const storePath = join(this.path, `${namespace}.json`)
    return existsSync(storePath)
  }

  createStore<T>(namespace = 'default', defaults: T): Store<T> {
    const configName = `${namespace}.json`
    return new StoreImpl(this.path, { configName, defaults })
  }
}
