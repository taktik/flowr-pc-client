import { CheckStateIs, State, StateMachineImpl } from 'typescript-state-machine'
import { CallStateMachine, CallState, OFF_HOOK_STATE, IDLE_STATE as CALL_IDLE_STATE, CLIENT_NOT_RUNNING_STATE, INCOMING_STATE } from './callStateMachine'
import { RegisterStateMachine, RegisterState, REGISTERED_STATE, UNREGISTERED_STATE, IDLE_STATE as REGISTER_IDLE_STATE } from './registerStateMachine'

enum ServerReference {
  SM01 = 'SM-01', // connected status
  SM02 = 'SM-02', // off hook status
  SM03 = 'SM-03',
  SM04 = 'SM-04',
  SM05 = 'SM-05',
  SM06 = 'SM-06',
  SM07 = 'SM-07',
  SM08 = 'SM-08',
  SM09 = 'SM-09',
  SM10 = 'SM-10', // unregistered
  SM11 = 'SM-11', // registered -1 (broken state)
  SM12 = 'SM-12',
  SM13 = 'SM-13',
  SM14 = 'SM-14', // init sent
  SM15 = 'SM-15', // unregister sent
  SM16 = 'SM-16', // call
  SM17 = 'SM-17', // status change
  SM18 = 'SM-18', // incoming call
  SM19 = 'SM-19',
  SM20 = 'SM-20', // unknown
  SM21 = 'SM-21', // dtmf
}

interface ServerMessage {
  reference: ServerReference,
  refrence?: ServerReference, // typo in received messages
  status?: string,
  message?: string
  action?: string,
  response?: string
  hook?: string,
  duration?: string,
  muted?: string,
  call_number?: string
  caller?: string
  from?: string
  to?: string
}

enum ConnectionStatesNames {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTED = 'CONNECTED',
}

export class ConnectionState extends State {
  constructor(readonly label: ConnectionStatesNames, readonly parent?: State) {
    super(label, parent)
  }
}

export const DISCONNECTED_STATE = new ConnectionState(ConnectionStatesNames.DISCONNECTED)
export const CONNECTED_STATE = new ConnectionState(ConnectionStatesNames.CONNECTED)

const CONNECTION_STATES = [
  DISCONNECTED_STATE,
  CONNECTED_STATE,
]

const CONNECTION_TRANSITIONS = {
  [ConnectionStatesNames.DISCONNECTED]: [CONNECTED_STATE],
  [ConnectionStatesNames.CONNECTED]: [DISCONNECTED_STATE],
}

/**
 * Handles the connection to the websocket server and the communications
 */
export class Dispatcher extends StateMachineImpl<ConnectionState> {
  private _url: string
  private _websocket: WebSocket | undefined
  private _registerStateMachine: RegisterStateMachine | undefined
  private _callStateMachine: CallStateMachine | undefined
  private _connectionTimeout: number | undefined

  private onConnect() {
    this.resetConnectionTimeout()
    this.updateStatus()
  }

  private updateStatus() {
    this.send('status')
  }

  private updateRegisterStatus() {
    this.send('status_register')
  }

  get url(): string {
    return this._url
  }

  set url(value: string) {
    const isDifferent = this._url !== value
    this._url = value

    if (this.inState(DISCONNECTED_STATE)) {
      this.connect()
    } else if (isDifferent) {
      this.disconnect()
    }
  }

  private set registerState(state: RegisterState) {
    if (this._registerStateMachine) {
      try {
        this._registerStateMachine.setState(state)
      } catch (e) {
        console.error('Error changing register state machine\'s state:', e)
        this.updateStatus()
        this.updateRegisterStatus()
      }
    }
  }

  private set callState(state: CallState) {
    if (this._callStateMachine) {
      try {
        this._callStateMachine.setState(state)
      } catch (e) {
        console.error('Error changing call state machine\'s state:', e)
        this.updateStatus()
        this.updateRegisterStatus()
      }
    }
  }

  private set callingNumber(caller: string) {
    if (this._callStateMachine) {
      this._callStateMachine.callingNumber = caller
    }
  }

  constructor(phoneServer: string | null) {
    super(CONNECTION_STATES, CONNECTION_TRANSITIONS, DISCONNECTED_STATE)
    this.onEnterState(DISCONNECTED_STATE, this.connect.bind(this))
    this.onEnterState(CONNECTED_STATE, this.onConnect.bind(this))
    // eslint-disable-next-line no-console
    this.onAnyTransition((from, to) => console.log(`Connection transitioned from ${from.label} to ${to.label}`))

    this._url = phoneServer || 'ws://127.0.0.1:8001'
  }

  private onMessage(event: MessageEvent) {
    const message = JSON.parse(event.data) as ServerMessage
    const reference = message.reference || message.refrence // typo in received messages

    switch (reference) {
      case ServerReference.SM01:
        this.setState(CONNECTED_STATE)
        break
      case ServerReference.SM02:
        this.callState = OFF_HOOK_STATE
        break
      case ServerReference.SM04:
        this.registerState = REGISTERED_STATE
        break
      case ServerReference.SM10:
        this.registerState = UNREGISTERED_STATE
        break
      case ServerReference.SM11:
      case ServerReference.SM20:
        if (this._callStateMachine) {
          this._callStateMachine.quit()
        }
        break
      case ServerReference.SM12:
        this.callState = CLIENT_NOT_RUNNING_STATE
        break
      case ServerReference.SM15:
        this.updateRegisterStatus()
        break
      case ServerReference.SM16:
      case ServerReference.SM18:
        if (message.caller) {
          this.callingNumber = message.caller
        }
        break
      case ServerReference.SM17:
        if (message.to) {
          this.statusChanged(message.to)
        }
        break
    }
  }

  private statusChanged(newStatus: string) {
    const callState = CallStateMachine.getStateFromStatus(newStatus)
    if (callState) {
      this.callState = callState
      return
    }
    const registerState = RegisterStateMachine.getStateFromStatus(newStatus)
    if (registerState) {
      this.registerState = registerState
      return
    }

    console.warn('No state found for status', newStatus)
  }

  private onError() {
    console.error('Connection error')
    // eslint-disable-next-line no-console
    console.log('Retrying in 5s')
    this._connectionTimeout = setTimeout(this.connect.bind(this), 5000)
  }

  private onClose() {
    this.setState(DISCONNECTED_STATE)
  }

  private resetConnectionTimeout() {
    if (this._connectionTimeout) {
      clearTimeout(this._connectionTimeout)
      this._connectionTimeout = undefined
    }
  }

  private connect() {
    this.resetConnectionTimeout()
    this.disconnect()

    if (this._url) {
      this._websocket = new WebSocket(this._url)
      this._websocket.onerror = this.onError.bind(this) as Dispatcher['onError']
      this._websocket.onopen = () => {
        if (this._websocket) {
          this._websocket.onclose = this.onClose.bind(this) as Dispatcher['onClose']
          this._websocket.onmessage = this.onMessage.bind(this) as Dispatcher['onMessage']
        }
      }
    }
  }

  private disconnect() {
    this.callState = CALL_IDLE_STATE
    this.registerState = REGISTER_IDLE_STATE
    if (this._websocket) {
      if ([0, 1].includes(this._websocket.readyState)) {
        this._websocket.close()
      }
      delete this._websocket
    }
  }

  setup(registerStateMachine: RegisterStateMachine, callStateMachine: CallStateMachine): void {
    this._registerStateMachine = registerStateMachine
    this._callStateMachine = callStateMachine
    this._registerStateMachine.onLeaveState(REGISTERED_STATE, this._callStateMachine.terminate.bind(this._callStateMachine))
    this._callStateMachine.onEnterState(OFF_HOOK_STATE, this.updateRegisterStatus.bind(this))
    this._callStateMachine.onEnterState(INCOMING_STATE, this.updateStatus.bind(this))
    this.connect()
  }

  setState(state: ConnectionState): void {
    if (!this.inState(state)) {
      super.setState(state)
    }
  }

  @CheckStateIs(CONNECTED_STATE, 'Cannot send message while disconnected')
  send(action: string, payload: {[key: string]: string} = {}): void {
    if (this._websocket) {
      this._websocket.send(JSON.stringify({ action, ...payload }))
    }
  }
}
