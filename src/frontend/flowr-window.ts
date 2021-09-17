import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import { Store } from './src/store'
// import { Player } from './src/player'
import { Player } from './src/players/playerNew'
import { KeyboardMixin } from '../keyboard/keyboardMixin'
import { IFlowrStore } from './src/interfaces/flowrStore'
import { FullScreenManager } from '../common/fullscreen'
import { setLevel } from './src/logging/loggers'
import { LogSeverity } from './src/logging/types'
import { IPlayer } from './src/players/abstractPlayer'
import { IPlayerStore, PipelineType } from './src/interfaces/playerStore'
import { VlcPlayer } from './src/players/vlc/player'

function toRatio(width: number, height: number) {
  return (value: number) => Math.floor((value - width) * height / width)
}

export class FlowrWindow extends KeyboardMixin(BrowserWindow) {

  private resizeTimeout?: NodeJS.Timeout
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

  initStore(desktopConfig: IFlowrStore, playerConfig: IPlayerStore): void {
    this.store.bulkSet(desktopConfig)
    setLevel(desktopConfig.logLevel ?? LogSeverity.INFO)

    if (!this.player) {
      // TODO: be able to update player's config without restarting
      const player = playerConfig.pipeline.use === PipelineType.VLC
        ? new VlcPlayer(playerConfig)
        : new Player(playerConfig)
      this.on('close', () => player.close())
      this.player = player
    }
  }
}
