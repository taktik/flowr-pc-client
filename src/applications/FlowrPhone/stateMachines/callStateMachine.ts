import { State, StateMachineImpl } from 'typescript-state-machine'
import { Dispatcher } from './dispatcher'
import { CallingNumber } from '../views/phone'

enum CallStatesNames {
  IDLE = 'IDLE',
  CLIENT_NOT_RUNNING = 'CLIENT_NOT_RUNNING',
  OFF_HOOK = 'OFF_HOOK',
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
  ANSWERED = 'ANSWERED',
  CALL_OUT = 'CALL_OUT',
}

export class CallState extends State {
  label: CallStatesNames
}

export const IDLE_STATE = new CallState(CallStatesNames.IDLE)
export const CLIENT_NOT_RUNNING_STATE = new CallState(CallStatesNames.CLIENT_NOT_RUNNING)
export const OFF_HOOK_STATE = new CallState(CallStatesNames.OFF_HOOK)
export const INCOMING_STATE = new CallState(CallStatesNames.INCOMING)
export const OUTGOING_STATE = new CallState(CallStatesNames.OUTGOING)
export const ANSWERED_STATE = new CallState(CallStatesNames.ANSWERED)
export const CALL_OUT_STATE = new CallState(CallStatesNames.CALL_OUT)

const CALL_STATES = [
  IDLE_STATE,
  CLIENT_NOT_RUNNING_STATE,
  OFF_HOOK_STATE,
  INCOMING_STATE,
  OUTGOING_STATE,
  ANSWERED_STATE,
  CALL_OUT_STATE,
]

const transitions = {
  [CallStatesNames.IDLE]: [OFF_HOOK_STATE, ANSWERED_STATE, INCOMING_STATE, OUTGOING_STATE, CALL_OUT_STATE, CLIENT_NOT_RUNNING_STATE],
  [CallStatesNames.CLIENT_NOT_RUNNING]: [OFF_HOOK_STATE, IDLE_STATE],
  [CallStatesNames.OFF_HOOK]: [INCOMING_STATE, OUTGOING_STATE, IDLE_STATE, CLIENT_NOT_RUNNING_STATE],
  [CallStatesNames.INCOMING]: [ANSWERED_STATE, OFF_HOOK_STATE, IDLE_STATE, CLIENT_NOT_RUNNING_STATE],
  [CallStatesNames.OUTGOING]: [CALL_OUT_STATE, OFF_HOOK_STATE, IDLE_STATE, CLIENT_NOT_RUNNING_STATE],
  [CallStatesNames.ANSWERED]: [OFF_HOOK_STATE, IDLE_STATE, CLIENT_NOT_RUNNING_STATE],
  [CallStatesNames.CALL_OUT]: [OFF_HOOK_STATE, IDLE_STATE, CLIENT_NOT_RUNNING_STATE],
}

const STATUS_TO_STATE: {[key: string]: CallState} = {
  'SIP client not running': CLIENT_NOT_RUNNING_STATE,
  offhook: OFF_HOOK_STATE,
  incomming_call: INCOMING_STATE,
  answered: ANSWERED_STATE,
  callout: CALL_OUT_STATE,
}

export class CallStateMachine extends StateMachineImpl<CallState> {
  private _dispatcher: Dispatcher
  private _initTimeout: number | undefined
  private _outGoingCallTimeout: number | null = null
  callingNumberChanged: (callingNumber: CallingNumber) => void

  set callingNumber(caller: string) {
    const callerName = caller.replace(/.*'([a-zA-Z\s]+)'.+/, '$1')
    const splitCaller = caller.replace(/[><]/g, '').split(':')
    const numberAndServer = splitCaller[1]
    const callingNumber = numberAndServer ? numberAndServer.split('@')[0] : splitCaller[0] || ''
    this.callingNumberChanged(callerName !== caller ? { name: callerName, value: callingNumber } : { value: callingNumber })
  }

  static getStateFromStatus(status: string): CallState {
    return STATUS_TO_STATE[status]
  }

  private attemptToInit() {
    this.init()
    this._initTimeout = setTimeout(this.attemptToInit.bind(this), 5000)
  }

  private clearInitAttemps() {
    if (this._initTimeout) {
      clearTimeout(this._initTimeout)
      this._initTimeout = undefined
    }
  }

  private init() {
    this._dispatcher.send('init')
  }

  constructor(dispatcher: Dispatcher, callingNumberChanged: (callingNumber: CallingNumber) => void) {
    super(CALL_STATES, transitions, IDLE_STATE)
    this._dispatcher = dispatcher
    this.callingNumberChanged = callingNumberChanged

    this.onEnterState(CLIENT_NOT_RUNNING_STATE, this.attemptToInit.bind(this))
    this.onLeaveState(CLIENT_NOT_RUNNING_STATE, this.clearInitAttemps.bind(this))

    this.onAnyTransition(this.stateChanged.bind(this))
  }

  setState(state: CallState): void {
    if (!this.inState(state)) {
      super.setState(state)
    }
  }

  terminate(): void {
    switch (this.state) {
      case OUTGOING_STATE:
        this.setState(OFF_HOOK_STATE)
        this._dispatcher.send('terminate')
        break
      case INCOMING_STATE:
      case ANSWERED_STATE:
      case CALL_OUT_STATE:
        this._dispatcher.send('terminate')
        break
      case OFF_HOOK_STATE:
        // Nothing to do
        break
    }
  }

  quit(): void {
    // eslint-disable-next-line no-console
    console.log('State machine quit')
    this._dispatcher.send('quit')
  }

  stateChanged(from: CallState, to: CallState): void {
    // eslint-disable-next-line no-console
    console.log(`Call transitioned from ${from.label} to ${to.label}`)
    if (this._outGoingCallTimeout) {
      clearTimeout(this._outGoingCallTimeout)
      this._outGoingCallTimeout = null
    }
  }

  call(callNumber: CallingNumber): void {
    this._dispatcher.send('call', { number: callNumber.value })
    this.callingNumberChanged(callNumber)
    this.setState(OUTGOING_STATE)
    this._outGoingCallTimeout = setTimeout(this.terminate.bind(this), 60000)
  }

  answer(): void {
    this._dispatcher.send('answer')
  }

  sendKey(key: string): void {
    this._dispatcher.send('dtmf', { number: key })
  }

  isCallingState(state: CallState): boolean {
    return [ANSWERED_STATE, CALL_OUT_STATE].includes(state)
  }

  isOffHookState(state: CallState): boolean {
    return [OFF_HOOK_STATE, IDLE_STATE, CLIENT_NOT_RUNNING_STATE].includes(state)
  }
}
