import { BrowserWindow, BrowserWindowConstructorOptions, screen } from 'electron'
import { Store } from './src/store'
import { Player } from './src/players/player'
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
          const mainScreen = screen.getPrimaryDisplay()
          const { width: mainWidth, height: mainHeight } = mainScreen.size
          let [width, height] = this.getSize()
          const previousSize = store.get('windowBounds')
          const deltaWidth = Math.abs(previousSize.width - width)
          const deltaHeight = Math.abs(previousSize.height - height)
          if (deltaWidth > deltaHeight) {
            height = toRatio(16, 9)(width)
            if (height > mainHeight) { // respect the max height
              width = toRatio(9, 16)(mainHeight)
              height = mainHeight
            }
          } else {
            width = toRatio(9, 16)(height)
            if (width > mainWidth) {
              height = toRatio(16, 9)(mainWidth)
              width = mainWidth
            }
          }
          this.setSize(width, height)
          store.set('windowBounds', { width, height })
        }
      }, 150)
    })
  }

  initStore(desktopConfig: IFlowrStore, playerConfig: Partial<IPlayerStore>): void {
    this.store.bulkSet(desktopConfig)
    setLevel(desktopConfig.logLevel ?? LogSeverity.INFO)

    if (!this.player) {
      const player = playerConfig.pipeline.use === PipelineType.VLC
        ? new VlcPlayer(this, playerConfig)
        : new Player(playerConfig)
      this.on('close', () => void player.close())
      this.player = player
    }
  }
}
