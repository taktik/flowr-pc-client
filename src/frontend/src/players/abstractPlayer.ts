import { ipcMain, IpcMainEvent } from 'electron'
import { Store } from '../store'
import { IPlayerStore } from '../interfaces/playerStore'
import { ILogger } from '../logging/types'
import { getLogger } from '../logging/loggers'

interface IPlayer {
  store: Store<IPlayerStore>
  close(): Promise<void>
}

type PlayProps = {
  url: string
  audioPid: number
  subtitlesPid: number
}

type SubtitlesProps = {
  audioPid: number
  subtitlesPid: number
}

abstract class AbstractPlayer implements IPlayer {
  abstract stop(): void | Promise<void>
  abstract play(event: IpcMainEvent, props: PlayProps): void | Promise<void>
  abstract setAudioTrack(event: IpcMainEvent, pid: number): void | Promise<void>
  abstract setSubtitles(event: IpcMainEvent, { audioPid, subtitlesPid }: SubtitlesProps): void | Promise<void>

  protected readonly _ipcEvents: {[key: string]: (...args: any[]) => void} = {}
  protected log: ILogger

  constructor(public store: Store<IPlayerStore>) {
    this.log = getLogger(this.constructor.name)

    // Base events to register: common for all players
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    const ipcEvents = {
      closestream: this.stop.bind(this),
      getSubtitleStreams: () => { /* Empty */ },
      setsubtitlestream: () => { /* Empty */ },
      openurl: this.play.bind(this),
      FlowrIsInitializing: this.stop.bind(this),
      setAudioPid: this.setAudioTrack.bind(this),
      setSubtitlesPid: this.setSubtitles.bind(this),
    }
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    Object.entries(ipcEvents).forEach(([name, handler]) => this.registerEvent(name, handler))
  }

  registerEvent(name: string, handler: (event: IpcMainEvent, ...args: any[]) => void): void {
    if (!this._ipcEvents[name]){
      this._ipcEvents[name] = handler
      ipcMain.on(name, handler)
    } else {
      this.log.warn(`Event ${name} has already been registered, cannot do it a second time`)
    }
  }

  async close(): Promise<void> {
    await this.stop()
    Object.entries(this._ipcEvents).forEach(event => ipcMain.removeListener(event[0], event[1]))
  }
}

export {
  AbstractPlayer,
  IPlayer,
  PlayProps,
  SubtitlesProps,
}