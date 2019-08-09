import { fsm } from 'typescript-state-machine'
import State = fsm.State
import StateMachineImpl = fsm.StateMachineImpl
import { CONNECTION_STATES, STATUS_TO_STATE, TRANSITIONS } from './constants'

enum ServerReference {
  SM01 = 'SM-01',
  SM02 = 'SM-02',
  SM03 = 'SM-03',
  SM04 = 'SM-04',
  SM05 = 'SM-05',
  SM06 = 'SM-06',
  SM07 = 'SM-07',
  SM08 = 'SM-08',
  SM09 = 'SM-09',
  SM10 = 'SM-10', // unregistered
  SM11 = 'SM-11',
  SM12 = 'SM-12',
  SM13 = 'SM-13',
  SM14 = 'SM-14',
  SM15 = 'SM-15',
  SM16 = 'SM-16',
  SM17 = 'SM-17',
  SM18 = 'SM-18',
  SM19 = 'SM-19',
  SM20 = 'SM-20',
}

interface ServerMessage {
  reference: ServerReference,
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

export class ConnectionState extends StateMachineImpl<State> {
  private _url: string
  private _websocket: WebSocket
  private _username: string

  get username() {
    return this._username
  }

  set username(value: string) {
    this._username = value

    if (this.inState(CONNECTION_STATES.INIT)) {
      this.register()
    } else if (this.inOneOfStates([CONNECTION_STATES.OFF_HOOK, CONNECTION_STATES.INCOMING, CONNECTION_STATES.ANSWERED, CONNECTION_STATES.CALL_OUT])) {
      this.unregister()
    }
  }

  constructor(phoneServer: string, username?: string) {
    super(Object.values(CONNECTION_STATES), TRANSITIONS, CONNECTION_STATES.DISCONNECTED)
    this._url = phoneServer || 'ws://127.0.0.1:8001'
    this.onEnterState(CONNECTION_STATES.DISCONNECTED, this.connect.bind(this))
    this.onEnterState(CONNECTION_STATES.CONNECTED, this.init.bind(this))
    this.onEnterState(CONNECTION_STATES.CLIENT_NOT_RUNNING, this.init.bind(this))
    this.onEnterState(CONNECTION_STATES.INIT, this.register.bind(this))

    this._username = username

    this.connect()
  }

  connect() {
    if (this._websocket) {
      if ([0, 1].includes(this._websocket.readyState)) {
        this._websocket.close()
      }
      delete this._websocket
    }
    this._websocket = new WebSocket(this._url)
    this._websocket.onerror = this.onError.bind(this)
    this._websocket.onopen = () => {
      this._websocket.onclose = this.onClose.bind(this)
      this._websocket.onmessage = this.onMessage.bind(this)
      this.setState(CONNECTION_STATES.CONNECTED)
    }
  }

  register() {
    if (this._username) {
      this.send('register', { username: this._username })
    }
  }

  unregister() {
    this.send('unregister')
  }

  init() {
    this.send('init')
  }

  send(action: string, payload: Object = {}) {
    this._websocket.send(JSON.stringify({ action, ...payload }))
  }

  onMessage(event: MessageEvent) {
    const message = JSON.parse(event.data) as ServerMessage

    switch (message.reference) {
      case ServerReference.SM10:
        this.setState(CONNECTION_STATES.INIT)
        break
      case ServerReference.SM17:
        this.statusChanged(message.to)
        break
    }
  }

  statusChanged(newStatus: string) {
    const state = CONNECTION_STATES[STATUS_TO_STATE[newStatus]]

    if (state) {
      this.setState(state)
    } else {
      console.warn('No state found for status', newStatus)
    }
  }

  onError() {
    console.error('Connection error')
    console.log('Retrying in 5s')
    setTimeout(this.connect.bind(this), 5000)
  }

  onClose() {
    this.setState(CONNECTION_STATES.DISCONNECTED)
  }
}
