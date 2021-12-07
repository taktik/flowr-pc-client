import * as deepExtend from 'deep-extend'
import { mergeWith } from 'lodash'
import { storeManager } from '../../../launcher'
import { IPlayerStore, PipelineType } from '../interfaces/playerStore'
import { IPlayer } from './abstractPlayer'
import { Player } from './player'
import { DEFAULT_PLAYER_STORE } from './playerStore'
import { VlcPlayer } from './vlc/player'
import { FlowrWindow } from "../../flowr-window";

export default function(flowrWindow: FlowrWindow, playerConfig: Partial<IPlayerStore>): IPlayer {
  const resolver = (stored: IPlayerStore): IPlayerStore => {
    // first fill in stored data from potentially new defaults
    const base = deepExtend({}, DEFAULT_PLAYER_STORE, stored)
    /**
     * Merge config from ozone over default ones
     * For empty values (null or '') coming from ozone, use the default value
     * If customizer function returns undefined, merging is handled by the method instead
    */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return mergeWith(base, playerConfig, (a, b) => b === null || b === '' ? a : undefined)
  }
  const store = storeManager.createStore<IPlayerStore>('player', { resolver })

  return store.get('pipeline').use === PipelineType.VLC
    ? new VlcPlayer(flowrWindow, store)
    : new Player(store)
}
