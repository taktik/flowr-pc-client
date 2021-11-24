import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import { Store } from './src/store'
import { KeyboardMixin } from '../keyboard/keyboardMixin'
import { IFlowrStore } from './src/interfaces/flowrStore'
import { FullScreenManager } from '../common/fullscreen'
import { setLevel } from './src/logging/loggers'
import { LogSeverity } from './src/logging/types'
import { IPlayer } from './src/players/abstractPlayer'
import { IPlayerStore } from './src/interfaces/playerStore'
import buildPlayer from './src/players/buildPlayer'

function toRatio(width: number, height: number) {
  return (value: number) => Math.floor((value - width) * height / width)
}

export class FlowrWindow extends KeyboardMixin(BrowserWindow) {
  private resizeTimeout?: number
  public player?: IPlayer

  get phoneServerUrl(): string | undefined {
    return this.store.get('phoneServer')
  }

  constructor(private store: Store<IFlowrStore>, options?: BrowserWindowConstructorOptions) {
    super(options)

    this.on('unmaximize', () => {
      const width = this.store.get('windowBounds').width
      const height = toRatio(16, 9)(width)

      this.setSize(width, height + 40)
    })

    this.on('resize', () => {
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout)
      }
      this.resizeTimeout = setTimeout(() => {
        if (!this.isMaximized() && !FullScreenManager.isFullScreen(this)) {
          const size = this.getSize()
          const width = size[0]
          const height = toRatio(16, 9)(width)
          this.setSize(width, height + 40)
          store.set('windowBounds', { width, height })
        }
      }, 150)
    })
  }

  initStore(desktopConfig: IFlowrStore, playerConfig: Partial<IPlayerStore>): void {
    this.store.bulkSet(desktopConfig)
    setLevel(desktopConfig.logLevel ?? LogSeverity.INFO)

    if (!this.player) {
      const player = buildPlayer(this, playerConfig)
      this.on('close', () => void player.close())
      this.player = player
    }
  }
}
