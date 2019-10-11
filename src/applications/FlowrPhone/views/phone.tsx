import * as React from 'react'
import { RegisterStateMachine, REGISTERED_STATE } from '../stateMachines/registerStateMachine'
import { IpcRenderer } from 'electron'
import { WindowModes } from '../WindowModes'
import { MainView } from './mainView'
import './icons'
import { CallState, CallStateMachine, INCOMING_STATE, CALL_OUT_STATE, OFF_HOOK_STATE, ANSWERED_STATE } from '../stateMachines/callStateMachine'
import { fsm } from 'typescript-state-machine'
import TransitionListener = fsm.ListenerRegistration
import { PhoneStateMachine } from '../stateMachines/factory'
import styled from 'styled-components'
import { ClickableIcon } from './clickableIcon'
import { Translator } from '../../../translator/translator'
import { fr } from '../translations/fr'
import { History, HistoryStore, PhoneHistory } from './history'

declare global {
  interface Window {
    ipcRenderer: IpcRenderer
  }
}

type PhoneProps = {
  phoneServer: string | null,
  className?: string,
  registerProps: RegisterProps | null,
  lang?: string,
  capabilities?: {[key: string]: boolean},
  currentUser: string,
  history: boolean,
  favorites: boolean,
}

type PhoneAppState = {
  callState: CallState | null,
  mode?: WindowModes,
  waiting: boolean,
  lang?: string,
  isMute: boolean,
  callingNumber: string,
  capabilities: {[key: string]: boolean} | undefined,
  phoneHistory: PhoneHistory[],
  elapsedTime: number,
}

export type RegisterProps = {
  username: string,
  host: string,
}

const UpperRightIcon = styled(ClickableIcon)`
  position: fixed;
  top: 12px;
  left: 12px;
  width: 24px;
  color: white;
`

export enum PhoneCapabilities {
  EMIT = 'emit',
  RECEIVE = 'receive',
}

interface PhoneStore {
  history?: HistoryStore
  favorites?: HistoryStore
}

export class Phone extends React.Component<PhoneProps, PhoneAppState> {
  private registerStateMachine: RegisterStateMachine
  private callStateMachine: CallStateMachine
  private callStateMachineListeners: TransitionListener[] = []
  private _ipc: IpcRenderer = window.ipcRenderer
  private _translator: Translator = new Translator()
  private _capabilities: {[key: string]: boolean} | undefined
  private _history: History | undefined = undefined

  private tickRequest: number | null = null
  private firstTick: number | undefined = undefined

  private _ipcEvents: {[key: string]: (...args: any[]) => void} = {
    'window-mode-changed': this.windowModeChanged.bind(this),
    'register-props': this.receivedRegisterProps.bind(this),
    'change-language': (e: Event, lang: string) => this.setState({ lang }),
    'mute-changed': this.muteStatusChanged.bind(this),
    'capabilities-changed': this.capabilitiesChanged.bind(this),
    'history-changed': this.historyChanged.bind(this),
    'current-user-changed': this.currentUserChanged.bind(this),
    'store-updated': this.storeUpdated.bind(this),
  }

  private ipcSend(message: string, payload: {[key: string]: any} = {}): () => void {
    return () => this._ipc.send(message, payload)
  }

  private storeFor(namespace: string) {
    return (data: {[key: string]: any}) => {
      console.log('PHONE store', { [namespace]: data })
      this.ipcSend('update-phone-store', { [namespace]: data })()
    }
  }

  constructor(props: PhoneProps) {
    super(props)
    const { registerStateMachine, callStateMachine } = PhoneStateMachine.factory(props.phoneServer, props.registerProps)
    this.registerStateMachine = registerStateMachine
    this.callStateMachine = callStateMachine

    Object.entries(this._ipcEvents).forEach(entry => this._ipc.on(entry[0], entry[1]))

    this.registerStateMachine.onEnterState(REGISTERED_STATE, this.listenToCallStateMachine.bind(this))
    this.registerStateMachine.onLeaveState(REGISTERED_STATE, this.unlistenToCallStateMachine.bind(this))

    this._translator.addKeys('fr', fr)
    this.setHistory(props.history, props.currentUser)

    this.state = {
      callState: null,
      waiting: false,
      lang: props.lang,
      isMute: false,
      callingNumber: this.callStateMachine.callingNumber,
      capabilities: props.capabilities,
      phoneHistory: [],
      elapsedTime: 0,
    }
    this.ipcSend('update-phone-store')()
  }

  setHistory(enabled: boolean, currentUser: string) {
    if (enabled) {
      if (!this._history) {
        this._history = new History({ currentUser, save: this.storeFor('history') })
      } else {
        this._history.user = currentUser || ''
      }
    }
  }

  canEmit(): boolean {
    return !this._capabilities || this._capabilities[PhoneCapabilities.EMIT]
  }

  canReceive(): boolean {
    return !this._capabilities || this._capabilities[PhoneCapabilities.RECEIVE]
  }

  muteStatusChanged(e: Event, isMute: boolean) {
    this.setState({ isMute })
  }

  windowModeChanged(e: Event, mode: WindowModes) {
    this.setState({ mode })
  }

  receivedRegisterProps(e: Event, registerProps: RegisterProps) {
    console.log('Received register props', registerProps)
    this.registerStateMachine.registerProps = registerProps
  }

  stateChanged(from: CallState, to: CallState) {
    if (this.tickRequest) {
      cancelAnimationFrame(this.tickRequest)
    }
    if (
        !this.canEmit() && to === CALL_OUT_STATE ||
        !this.canReceive() && to === INCOMING_STATE
    ) {
      return
    }
    if (this.callStateMachine.isCallStarting(to)) {
      this.startTick()
    } else if (this.callStateMachine.isCallEnding(to) && this._history) {
      this._history.addToHistory({
        date: Date.now(),
        duration: this.state.elapsedTime,
        number: this.state.callingNumber,
        status: this._history.statusForState(from),
      })
    }
    if (([INCOMING_STATE, ANSWERED_STATE].includes(from) || !this.canEmit()) && to === OFF_HOOK_STATE) {
      this.hide()
    }
    this.setState({ callState: to, callingNumber: this.callStateMachine.callingNumber, elapsedTime: 0 })
  }

  capabilitiesChanged(e: Event, capabilities: {[key: string]: boolean} | undefined) {
    this._capabilities = capabilities
    this.setState({ capabilities })
  }

  historyChanged(e: Event, history: boolean) {
    if (this._history && !history) {
      console.log('History functionality revoked')
      delete this._history
    }
  }

  currentUserChanged(e: Event, currentUser: string) {
    if (this._history) {
      this._history.user = currentUser
    }
  }

  storeUpdated(e: Event, storeData: PhoneStore) {
    if (this._history) {
      this._history.store = storeData.history
      this.setState({ phoneHistory: this._history.list })
    }
  }

  listenToCallStateMachine() {
    if (!this.callStateMachineListeners.length) {
      this.callStateMachineListeners = [
        this.callStateMachine.onAnyTransition(this.stateChanged.bind(this)),
        this.callStateMachine.onEnterState(INCOMING_STATE, this.ipcSend('phone-show')),
      ]
    }
    this.setState({ callState: this.callStateMachine.state })
  }

  unlistenToCallStateMachine() {
    if (this.callStateMachineListeners) {
      this.callStateMachineListeners.forEach(listener => listener.cancel())
      this.callStateMachineListeners = []
    }
    this.setState({ callState: null })
  }

  call(callNumber: string) {
    if (this.canEmit()) {
      this.callStateMachine.call(callNumber)
    }
  }

  answer() {
    if (this.canReceive()) {
      this.callStateMachine.answer()
    }
  }

  hangup() {
    this.callStateMachine.terminate()
  }

  hide() {
    this.hangup()
    this.ipcSend('phone-hide')()
  }

  sendKey(key: string) {
    this.callStateMachine.sendKey(key)
  }

  private startTick() {
    this.firstTick = Date.now()
    this.tickRequest = requestAnimationFrame(this.tick.bind(this))
  }

  private tick() {
    if (this.firstTick === undefined) {
      return
    }
    const elapsedTime = Date.now() - this.firstTick
    this.setState({ elapsedTime })
    this.tickRequest = requestAnimationFrame(this.tick.bind(this))
  }

  render() {
    return (
      <div className={this.props.className}>
        <MainView
            translator={this._translator}
            lang={this.state.lang}
            callState={this.state.callState}
            waiting={this.state.waiting}
            call={this.call.bind(this)}
            answer={this.answer.bind(this)}
            hangup={this.hangup.bind(this)}
            mute={this.ipcSend('phone-mute')}
            callingNumber={this.state.callingNumber}
            capabilities={this.state.capabilities}
            history={this.state.phoneHistory}
            sendKey={this.sendKey.bind(this)}
            elapsedTime={this.state.elapsedTime}
        />
        <UpperRightIcon onClick={this.hide.bind(this)} icon="times" />
      </div>
    )
  }

  componentWillUnmount() {
    this.unlistenToCallStateMachine()
    Object.entries(this._ipcEvents).forEach(entry => this._ipc.removeListener(entry[0], entry[1]))
    if (this.tickRequest) {
      cancelAnimationFrame(this.tickRequest)
    }
  }
}
