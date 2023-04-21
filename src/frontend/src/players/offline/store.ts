import { writeFile } from 'fs/promises'
import { join } from 'path'
import { Writable } from 'stream'
import { State, StateMachineImpl, Transitions } from 'typescript-state-machine'
import { getLogger } from '../../logging/loggers'

enum StoreStateName {
    IDLE = 'IDLE',
    STORING = 'STORING',
    ERROR = 'ERROR',
}

class StoreState extends State {
    label: StoreStateName
}

const idleState = new StoreState(StoreStateName.IDLE)
const storingState = new StoreState(StoreStateName.STORING)
const errorState = new StoreState(StoreStateName.ERROR)

const states = [idleState, storingState, errorState]

const transitions: Transitions<StoreState> = {
    [StoreStateName.IDLE]: [storingState, errorState],
    [StoreStateName.STORING]: [idleState, errorState],
    [StoreStateName.ERROR]: [idleState],
}

class StoreStateMachine extends StateMachineImpl<StoreState> {
    constructor() {
        super(states, transitions, idleState)
    }
}

type ChunksStoreProps = {
    rootFolder: string // root path
}

/**
 * To be piped AFTER an interval stream (that will send chunks at "liveCache" interval)
 * 
 *  HOW TO AVOID DISCONTINUITIES ??
 *      let's say a user pauses the stream at T1 and resumes at T2
 *      they then leave the replay to go back to the live for some time
 *      then they pause the stream again at T3: how do we invalidate the chunks from T1 to T2 ?
 *      ----> declare a minValidTimestamp whenever we enter storingState and store it somewhere ?
 */
class ChunksStore extends Writable {
    private readonly log = getLogger(`ChunkStore-${Date.now()}`)
    private readonly stateMachine = new StoreStateMachine()
    private liveCache?: { buffer: Buffer, timestamp: number }

    readonly rootFolder: string

    storedStartTimestamp?: number
    storedStopTimestamp?: number

    get state(): StoreState {
        return this.stateMachine.state
    }

    get timestamp(): number {
        return Date.now()
    }

    constructor({ rootFolder }: ChunksStoreProps) {
        super()

        this.rootFolder = rootFolder
        this.stateMachine.onEnterState(storingState, () => {
            this.storedStartTimestamp = this.timestamp
            this.storedStopTimestamp = undefined
        })
        this.stateMachine.onLeaveState(storingState, () => {
            this.storedStopTimestamp = this.timestamp
        })
    }

    private filePath(timestamp = this.timestamp): string {
        return join(this.rootFolder, `${timestamp}.ts`)
    }

    private async store(chunk: Buffer, timestamp?: number) {
        await writeFile(this.filePath(timestamp), chunk)
    }

    _write(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error) => void): void {
        if (this.state === storingState) {
            this.store(chunk)
                .then(() => callback(null))
                .catch((error) => callback(error))
        } else {
            try {
                this.liveCache = { buffer: chunk, timestamp: this.timestamp }
                callback(null)
            } catch (error) {
                callback(error)
            }
        }
    }

    persist(): void {
        // Let it throw, let it throw
        this.stateMachine.setState(storingState)

        if (this.liveCache) {
            this.store(this.liveCache.buffer, this.liveCache.timestamp)
                .catch(error => {
                    this.log.warn('Failed to store pre-cached data', error)
                })
                .finally(() => {
                    this.liveCache = undefined
                })
        }
    }

    backToLive(): void {
        // Let it throw, let it throw
        this.stateMachine.setState(idleState)
    }

    isInState(state: StoreState): boolean {
        return this.stateMachine.inState(state)
    }
}

export {
    ChunksStore,
    idleState,
    storingState,
    errorState,
}
