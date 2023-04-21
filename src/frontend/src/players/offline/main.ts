import { ReadMode } from '@taktik/buffers'
import { mkdir, readFile, rm } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { Readable } from 'stream'
import { IntervalStream } from '../intervalStream'
import { ChunkMeta } from './meta'
import { ChunkReader } from './reader'
import { ChunksStore, idleState } from './store'

const ROOT_FOLDER = join(homedir(), '.flowr', 'player')
const CHUNKS_FOLDER_NAME = 'chunks'
const META_FILE_NAME = 'meta.json'

async function cleanupp(path: string): Promise<void> {
    try {
        await rm(path, { recursive: true })
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error
        }
    }
}

async function createDir(path: string): Promise<void> {
    try {
        await mkdir(path, { recursive: true })
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
            throw error
        }
    }
}

async function getMeta(path: string): Promise<ChunkMeta> {
    try {
        const content = await readFile(path, 'utf-8')

        return JSON.parse(content) as ChunkMeta
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error
        }
    }

    return {}
}

async function init(rootFolder: string, cleanup: boolean): Promise<string> {
    if (cleanup) {
        await cleanupp(rootFolder)
    }

    const chunksFolder = join(rootFolder, CHUNKS_FOLDER_NAME)
    const metaPath = join(rootFolder, META_FILE_NAME)

    await createDir(rootFolder)
    await createDir(chunksFolder)
    const meta = await getMeta(metaPath)

    return rootFolder
}

class OfflineHandler {
    private readonly chunksFolder: string

    private initPromise
    private interval = new IntervalStream({
        capacity: 50_000_000,
        maxCapacity: 200_000_000,
        readMode: ReadMode.SLICE,
        sendInterval: 10_000,
    })
    private writer: ChunksStore
    private reader?: ChunkReader

    constructor(
        private readonly name: string,
        readonly input: Readable,
    ) {
        const rootFolder = join(ROOT_FOLDER, name)
        this.chunksFolder = join(rootFolder, CHUNKS_FOLDER_NAME)
        this.writer = new ChunksStore({ rootFolder: this.chunksFolder })
        this.interval.pipe(this.writer)
        this.initPromise = this.init(rootFolder)
    }

    private async init(rootFolder: string) {
        await init(rootFolder, true)
        this.input.pipe(this.interval)
    }

    private waitReady<Args extends any[], Res>(fun: (...args: Args) => Res): (...args: Args) => Promise<Res> {
        return async (...args: Args): Promise<Res> => {
            await this.initPromise
            return fun(...args)
        }
    }

    pause = this.waitReady(() => {
        if (this.writer.isInState(idleState)) {
            this.writer.persist()
        }
        this.reader?.pause()
    })
    resume = this.waitReady(() => {
        if (this.reader) {
            this.reader.resume()
            return this.reader
        }
        return this.reader = new ChunkReader({ minTimestamp: this.writer.storedStartTimestamp, rootFolder: this.chunksFolder })
    })
    backToLive = this.waitReady(() => {
        this.writer.backToLive()
        this.reader?.destroy()
        this.reader = undefined
    })
}

export {
    OfflineHandler,
    init as initChunkStorage
}
