import * as React from 'react'
import { RegisterStateMachine, REGISTERED_STATE } from '../stateMachines/registerStateMachine';
import { IpcRenderer } from 'electron';
import { WindowModes } from '../WindowModes';
import { MainView } from './mainView';
import './icons'
import { CallState, CallStateMachine, INCOMING_STATE } from '../stateMachines/callStateMachine';
import { fsm } from 'typescript-state-machine'
import TransitionListener = fsm.ListenerRegistration
import { PhoneStateMachine } from '../stateMachines/factory';
import styled from 'styled-components';
import { ClickableIcon } from './clickableIcon';

declare global {
  interface Window {
    ipcRenderer: IpcRenderer
  }
}

type PhoneProps = {
  phoneServer: string,
  className?: string,
  registerProps: RegisterProps,
}

type PhoneAppState = {
  callState: CallState,
  mode?: WindowModes,
  waiting: boolean,
}

export type RegisterProps = {
  username: string,
  host: string,
}

const UpperRightIcon = styled(ClickableIcon)`
  position: fixed;
  top: 5px;
  right: 5px;
  width: 50px;
`

export class Phone extends React.Component<PhoneProps, PhoneAppState> {
  private registerStateMachine: RegisterStateMachine
  private callStateMachine: CallStateMachine
  private callStateMachineListeners: TransitionListener[] = []
  private _ipc: IpcRenderer = window.ipcRenderer

  constructor(props: PhoneProps) {
    super(props)
    const { registerStateMachine, callStateMachine } = PhoneStateMachine.factory(props.phoneServer, props.registerProps)
    this.registerStateMachine = registerStateMachine
    this.callStateMachine = callStateMachine

    this._ipc.on('window-mode-changed', this.windowModeChanged.bind(this))
    this._ipc.on('register-props', this.receivedRegisterProps.bind(this))

    this.registerStateMachine.onEnterState(REGISTERED_STATE, this.listenToCallStateMachine.bind(this))
    this.registerStateMachine.onLeaveState(REGISTERED_STATE, this.unlistenToCallStateMachine.bind(this))

    this.state = { callState: null, waiting: false }
  }

  maximize() {
    this._ipc.send('phone-maximize')
  }

  reduce() {
    this._ipc.send('phone-reduce')
  }

  show() {
    this._ipc.send('phone-show')
  }

  hide() {
    this._ipc.send('phone-hide')
  }

  windowModeChanged(e: Event, mode: WindowModes) {
    this.setState({ mode })
  }

  receivedRegisterProps(e: Event, registerProps: RegisterProps) {
    console.log('Received register props', registerProps)
    this.registerStateMachine.registerProps = registerProps
  }

  stateChanged(from: CallState, to: CallState) {
    this.setState({ callState: to })
  }

  listenToCallStateMachine() {
    if (!this.callStateMachineListeners.length) {
      this.callStateMachineListeners = [
        this.callStateMachine.onAnyTransition(this.stateChanged.bind(this)),
        this.callStateMachine.onEnterState(INCOMING_STATE, this.show.bind(this))
      ]
    }
    this.setState({ callState: this.callStateMachine.state })
  }

  unlistenToCallStateMachine() {
    if (!this.callStateMachineListeners) {
      this.callStateMachineListeners.forEach(listener => listener.cancel())
      this.callStateMachineListeners = []
    }
    this.setState({ callState: null })
  }

  call(callNumber: string) {
    this.callStateMachine.call(callNumber)
  }

  answer() {
    this.callStateMachine.answer()
  }

  hangup() {
    this.callStateMachine.terminate()
  }

  // private triggerConnectionStateMachineAction <T> (ctx: any, callback: (...args: T[]) => any, ...args: T[]) {
  //   callback.apply(ctx, args)
  //   this.setState({ waiting: true })
  //   this.connectionStateMachine.waitUntilLeft(this.connectionStateMachine.state)
  //     .then(() => this.setState({ waiting: false }))
  // }

  render() {
    return (
      <div className={this.props.className}>
        <MainView callState={this.state.callState} waiting={this.state.waiting} call={this.call.bind(this)} answer={this.answer.bind(this)} hangup={this.hangup.bind(this)} />
        <UpperRightIcon onClick={this.hide.bind(this)} icon="window-close" />
      </div>
    )
  }
}
