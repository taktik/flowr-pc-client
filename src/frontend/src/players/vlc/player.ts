import { ChildProcess, spawn } from 'child_process'
import type { BrowserWindow, IpcMainEvent, WebContents } from 'electron'
import { IPlayerStore } from '../../interfaces/playerStore'
import { ILogger } from '../../logging/types'
import { Store } from '../../store'
import { AbstractPlayer, PlayProps } from '../abstractPlayer'
import { IMessage, LogMessage, MessageType, ProcessMessaging, VLCLogLevel } from './messaging'
import { ResetableTimeout } from './resetableTimeout'

type ResizeProps = {
  width: number
	height: number
	x: number
	y: number
}

function toRectangle({ x, y, width, height }: ResizeProps): string {
  return `"${x}, ${y}, ${width}, ${height}"`
}

export class VlcPlayer extends AbstractPlayer {
  private process?: ChildProcess
  private messaging?: ProcessMessaging
  private playerPosition: ResizeProps = { x: 0, y: 0, width: 0, height: 0 }
  private keepAliveTimeout?: ResetableTimeout
  private frontendWebView?: WebContents

  constructor(private readonly flowrWindow: BrowserWindow, store: Store<IPlayerStore>) {
    super(store)
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    this.onClose = this.onClose.bind(this)
    this.onError = this.onError.bind(this)
    this.onMessage = this.onMessage.bind(this)
    this.resize = this.resize.bind(this)
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */

    // eslint-disable-next-line @typescript-eslint/unbound-method
    this.registerEvent('resize', this.resize)
  }

  private resetKeepAlive() {
    this.keepAliveTimeout?.reset()
  }

  private startKeepAlive(process: ChildProcess, url: string) {
    const timeout = this.store.get('pipeline')?.metadata?.keepAliveTimeout ?? 5_000

    this.keepAliveTimeout = new ResetableTimeout(() => {
      this.log.warn('Player process not responsive, restarting it.')
      this.clear(process)
      this.startProcess(url)
    }, timeout)
  }

  private startProcess(url: string) {
    const path = this.store.get('pipeline')?.metadata?.applicationPath

    if (!path) {
      throw Error('No path is defined for VLC executable. Please configure it in flowr-admin\'s settings')
    }
    const args = [url, toRectangle(this.playerPosition)]
    const process = spawn(path, args)

    /* eslint-disable @typescript-eslint/unbound-method */
    process.on('close', this.onClose)
    process.on('error', this.onError)
    this.messaging = new ProcessMessaging(process)
    this.messaging.addListener(this.onMessage)
    /* eslint-enable @typescript-eslint/unbound-method */
    this.startKeepAlive(process, url)
    this.process = process
  }

  private clear(process: ChildProcess) {
    if (process.exitCode === null) {
      // Process is still running
      process.kill()
    }
    this.process = undefined
    /* eslint-disable @typescript-eslint/unbound-method */
    process.off('close', this.onClose)
    process.off('error', this.onError)
    /* eslint-enable @typescript-eslint/unbound-method */

    if (this.messaging) {
      this.messaging.destroy()
      this.messaging = undefined
    }
    this.keepAliveTimeout?.clear()
    this.keepAliveTimeout = undefined
    this.frontendWebView = undefined
  }

  private onClose(code: number) {
    if (this.process) {
      this.log.info('Process closed with code', code)
      this.clear(this.process)
    }
  }

  private onError(e: Error) {
    if (this.process) {
      this.log.error('Error in VLC application', e)
      this.clear(this.process)
    }
  }

  private getLogFunctionForLevel(vlcLevel: VLCLogLevel): ILogger['debug'] | ILogger['info'] | ILogger['warn'] | ILogger['error'] {
    switch (vlcLevel) {
      case VLCLogLevel.DEBUG:
        return this.log.debug.bind(this.log) as ILogger['debug']
        break
      case VLCLogLevel.WARN:
        return this.log.warn.bind(this.log) as ILogger['warn']
        break
      case VLCLogLevel.ERROR:
        return this.log.error.bind(this.log) as ILogger['error']
        break
      case VLCLogLevel.INFO:
      default:
        return this.log.info.bind(this.log) as ILogger['info']
    }
  }

  private handleLogMessage(message: LogMessage) {
    const logger = this.getLogFunctionForLevel(message.Level)
    logger(message.Timestamp, message.MessageTemplate)
  }

  private onMessage(message: IMessage) {
    try {
      switch (message.type) {
        case MessageType.ALIVE:
          this.log.debug('Keep alived received')
          this.resetKeepAlive()
          break
        case MessageType.VLC:
          // forward directly to flowr-frontend
          this.frontendWebView?.send('vlc-message', message.data)
          break
        case MessageType.LOG:
          this.handleLogMessage(JSON.parse(message.data.value) as LogMessage)
          break
        case MessageType.UNKNOWN:
        default:
          this.log.info('Unknown message received', message.data)
      }
    } catch (e) {
      this.log.warn('Failed to handle message', message, e)
    }
  }

  stop(): void {
    if (this.process) {
      this.clear(this.process)
    }
  }

  play({ sender }: IpcMainEvent, { url }: PlayProps): void {
    try {
      this.frontendWebView = sender
      this.startProcess(url)
    } catch (e) {
      this.log.warn('Failed to instantiate player.', e)
    }
  }

  setAudioTrack(): void {
    // not required now, maybe later
  }

  setSubtitles(): void {
    // not required now, maybe later
  }

  resize(_: IpcMainEvent, { x, y, width, height }: ResizeProps): void {
    const windowPosition = this.flowrWindow.getBounds()
    this.playerPosition = {
      x: Math.floor(x + windowPosition.x),
      y: Math.floor(y + windowPosition.y),
      width: Math.floor(width),
      height: Math.floor(height),
    }
  }

  async close(): Promise<void> {
    await super.close()
    if (this.process) {
      this.clear(this.process)
    }
  }
}
