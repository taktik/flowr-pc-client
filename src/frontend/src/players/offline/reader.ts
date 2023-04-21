import { CircularBuffer, ReadMode } from '@taktik/buffers'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { Readable } from 'stream'
import { State, StateMachineImpl, Transitions } from 'typescript-state-machine'
import { getLogger } from '../../logging/loggers'

enum StoreStateName {
    READY = 'READY',
    LOADING = 'LOADING',
    PUSHING = 'PUSHING',
    WAITING = 'WAITING',
    READING = 'READING',
    ERROR = 'ERROR',
}

class StoreState extends State {
    label: StoreStateName
}

const readyState = new StoreState(StoreStateName.READY)
const loadingState = new StoreState(StoreStateName.LOADING)
const waitingState = new StoreState(StoreStateName.WAITING)
const errorState = new StoreState(StoreStateName.ERROR)

const states = [readyState, loadingState, errorState, waitingState]

const transitions: Transitions<StoreState> = {
    [StoreStateName.READY]: [errorState, loadingState, waitingState],
    [StoreStateName.WAITING]: [errorState, loadingState],
    [StoreStateName.LOADING]: [errorState, readyState, waitingState],
    [StoreStateName.ERROR]: [readyState],
}

class StoreStateMachine extends StateMachineImpl<StoreState> {
    constructor() {
        super(states, transitions, waitingState)
    }
}

type ChunksReaderProps = {
    rootFolder: string // root path
    minTimestamp: number
}

const READ_SIZE = 188 * 1000

class ChunkReader extends Readable {
    private readonly buffer = new CircularBuffer({
        allowOverwrite: false,
        capacity: 30_000_000,
        readMode: ReadMode.SLICE,
    })
    private readonly log = getLogger(`ChunkReader-${Date.now()}`)
    private readonly stateMachine = new StoreStateMachine()

    private readTs?: number
    private interval?: NodeJS.Timeout

    readonly rootFolder: string

    minTimestamp: number

    get state(): StoreState {
        return this.stateMachine.state
    }
  
    constructor({ minTimestamp, rootFolder }: ChunksReaderProps) {
        super()

        this.rootFolder = rootFolder
        this.minTimestamp = minTimestamp

        
        this.stateMachine.onEnterState(readyState, () => this.pushLoop())
        
        this.stateMachine.onLeaveState(waitingState, () => clearInterval(this.interval))
        this.stateMachine.onEnterState(waitingState, () => {
            clearInterval(this.interval)
            this.interval = setInterval(() => this.fill(), 1000)
        })
    }

    private handleError(error: Error): void {
        this.log.error('UNKNOWN ERROR FOR NOW', error)
    }

    private findIndex(files: string[], ts: number): number {
        const prevDistances: number[] = []

        for (let i = 0; i < files.length; i++) {
            const asTimestamp = parseInt(files[i])
            const distance = asTimestamp - ts
    
            if (
                prevDistances.length &&
                Math.abs(distance) > Math.abs(prevDistances[i - 1])
            ) {
                // take closest "earlier" chunk
                return prevDistances[i - 1] <= 0 ? i - 1 : Math.max(i - 2, 0)
            }

            prevDistances.push(distance)
        }

        return files.length - 1
    }

    private async fillBuffer() {
        if (this.stateMachine.inState(loadingState) || !this.buffer.availableWrite) {
            // already parsing or buffer is full
            return
        }

        this.stateMachine.setState(loadingState)

        let pushedContent = false

        try {
            const files = await readdir(this.rootFolder)
            const ts = this.readTs || this.minTimestamp
            const toAdd = this.readTs ? 1 : 0
            const firstIndex = this.findIndex(files, ts) + toAdd

            for (let i = firstIndex; i < files.length; i++) {
                const n = files[i]
                const buffer = await readFile(join(this.rootFolder, n))
                
                if (this.buffer.availableWrite >= buffer.length) {
                    this.buffer.write(buffer)
                    pushedContent = true
                    this.readTs = parseInt(n)
                } else {
                    this.log.debug('Read buffer full')
                    break
                }
            }
        } catch (error) {
            this.handleError(error)
        }

        const newState = pushedContent ? readyState : waitingState

        this.stateMachine.setState(newState)
    }

    private fill(): void {
        this.fillBuffer()
            .catch(error => this.handleError(error))
    }

    private pushChunk(): boolean {
        const toRead = Math.min(this.buffer.availableRead, READ_SIZE)
        const buffer = this.buffer.read(toRead)

        try {
            return this.push(buffer)
        } catch (error) {
            this.buffer.rewind(toRead)
        }

        return false
    }

    private pushLoop(): void {
        try {
            while (this.buffer.availableRead && this.pushChunk()) {
                // chunk already pushed in condition
            }
        } catch (error) {
            this.log.warn('An error occurred when pushing buffered data', error)
            this.emit('error', error)
        }

        if (!this.buffer.availableRead) {
            this.stateMachine.setState(waitingState)
        }
    }

    _construct(callback: (error?: Error) => void): void {
        this.fillBuffer()
            .then(() => callback())
            .catch(error => callback(error))
    }

    _read(): void {
        try {
            if (this.stateMachine.inState(readyState)) {
                this.pushLoop()
            }
        } catch (error) {
            this.handleError(error)
        }
    }

    _destroy(error: Error, callback: (error?: Error) => void): void {
        clearInterval(this.interval)
        callback(error)
    }
}

export {
    ChunkReader,
}
