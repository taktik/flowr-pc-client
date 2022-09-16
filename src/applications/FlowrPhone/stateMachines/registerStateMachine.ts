import { State, StateMachineImpl } from 'typescript-state-machine'
import { RegisterProps } from '../views/phone'
import { Dispatcher } from './dispatcher'

enum RegisterStatesNames {
  IDLE = 'IDLE',
  UNREGISTERED = 'UNREGISTERED',
  REGISTERED = 'REGISTERED',
}

export class RegisterState extends State {
  constructor(readonly label: RegisterStatesNames, readonly parent?: State) {
    super(label, parent)
  }
}

export const IDLE_STATE = new RegisterState(RegisterStatesNames.IDLE)
export const UNREGISTERED_STATE = new RegisterState(RegisterStatesNames.UNREGISTERED)
export const REGISTERED_STATE = new RegisterState(RegisterStatesNames.REGISTERED)

const STATUS_TO_STATE: {[key: string]: RegisterState} = {
  unregistered: UNREGISTERED_STATE,
  registered: REGISTERED_STATE,
}

const REGISTER_STATES = [
  IDLE_STATE,
  UNREGISTERED_STATE,
  REGISTERED_STATE,
]

const CONNECTION_TRANSITIONS = {
  [RegisterStatesNames.IDLE]: [REGISTERED_STATE, UNREGISTERED_STATE],
  [RegisterStatesNames.UNREGISTERED]: [REGISTERED_STATE, IDLE_STATE],
  [RegisterStatesNames.REGISTERED]: [UNREGISTERED_STATE, IDLE_STATE],
}

function validRegisterProps(registerProps: RegisterProps) {
  return !!registerProps && !!registerProps.host && !!registerProps.username
}

export class RegisterStateMachine extends StateMachineImpl<RegisterState> {
  private _dispatcher: Dispatcher
  private _registerProps: RegisterProps | null = null
  private _registerTimeout: number | undefined

  static getStateFromStatus(status: string): RegisterState {
    return STATUS_TO_STATE[status]
  }

  get registerProps(): RegisterProps | null {
    return this._registerProps
  }

  set registerProps(props: RegisterProps | null) {
    const isDifferent = !this.registerProps || (props && (props.host !== this._registerProps.host || props.username !== this._registerProps.username))
    this._registerProps = props

    if (isDifferent && this.inState(REGISTERED_STATE)) {
      this.unregister()
    } else if (this.inState(UNREGISTERED_STATE)) {
      this.attemptToRegister()
    }
  }

  constructor(dispatcher: Dispatcher, registerProps: RegisterProps | null) {
    super(REGISTER_STATES, CONNECTION_TRANSITIONS, IDLE_STATE)
    this.onEnterState(UNREGISTERED_STATE, this.attemptToRegister.bind(this))
    this.onLeaveState(UNREGISTERED_STATE, this.clearRegisterAttempts.bind(this))
    // eslint-disable-next-line no-console
    this.onAnyTransition((from, to) => console.log(`Register transitioned from ${from.label} to ${to.label}`))

    this._dispatcher = dispatcher
    this.registerProps = registerProps
  }

  private attemptToRegister() {
    if (validRegisterProps(this._registerProps)) {
      this.register()
    }
    clearTimeout(this._registerTimeout)
    this._registerTimeout = setTimeout(this.attemptToRegister.bind(this), 5000)
  }

  private clearRegisterAttempts() {
    if (this._registerTimeout) {
      clearTimeout(this._registerTimeout)
      this._registerTimeout = undefined
    }
  }

  private register() {
    if (validRegisterProps(this._registerProps)) {
      this.send('register', this._registerProps)
    }
  }

  private unregister() {
    this.send('unregister')
  }

  private send(action: string, payload: {[key: string]: string} = {}) {
    this._dispatcher.send(action, payload)
  }

  setState(state: RegisterState): void {
    if (!this.inState(state)) {
      super.setState(state)
    }
  }
}
