import { fsm } from 'typescript-state-machine'
import State = fsm.State

enum StatesNames {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTED = 'CONNECTED',
  INIT = 'INIT',
  CLIENT_NOT_RUNNING = 'CLIENT_NOT_RUNNING',
  OFF_HOOK = 'OFF_HOOK',
  INCOMING = 'INCOMING',
  ANSWERED = 'ANSWERED',
  CALL_OUT = 'CALL_OUT',
}

export const STATUS_TO_STATE: {[key: string]: StatesNames} = {
  disconnected: StatesNames.DISCONNECTED,
  connected: StatesNames.CONNECTED,
  init: StatesNames.INIT,
  'SIP client not running': StatesNames.CLIENT_NOT_RUNNING,
  offhook: StatesNames.OFF_HOOK,
  incomming_call: StatesNames.INCOMING,
  answered: StatesNames.ANSWERED,
  callout: StatesNames.CALL_OUT,
}

export const CONNECTION_STATES: {[key: string]: State} = Object.values(StatesNames).reduce((acc, stateName) => {
  return Object.assign({}, acc, { [stateName]: new State(stateName) })
}, {})

export const TRANSITIONS = {
  [StatesNames.DISCONNECTED]: [CONNECTION_STATES.CONNECTED],
  [StatesNames.CONNECTED]: [CONNECTION_STATES.INIT, CONNECTION_STATES.CLIENT_NOT_RUNNING, CONNECTION_STATES.DISCONNECTED],
  [StatesNames.INIT]: [CONNECTION_STATES.OFF_HOOK, CONNECTION_STATES.DISCONNECTED],
  [StatesNames.CLIENT_NOT_RUNNING]: [CONNECTION_STATES.INIT, CONNECTION_STATES.DISCONNECTED],
  [StatesNames.OFF_HOOK]: [CONNECTION_STATES.INCOMING, CONNECTION_STATES.CALL_OUT, CONNECTION_STATES.DISCONNECTED],
  [StatesNames.INCOMING]: [CONNECTION_STATES.ANSWERED, CONNECTION_STATES.OFF_HOOK, CONNECTION_STATES.DISCONNECTED],
  [StatesNames.ANSWERED]: [CONNECTION_STATES.OFF_HOOK, CONNECTION_STATES.DISCONNECTED],
  [StatesNames.CALL_OUT]: [CONNECTION_STATES.OFF_HOOK, CONNECTION_STATES.DISCONNECTED],
}
