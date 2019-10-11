import { CallState, INCOMING_STATE, ANSWERED_STATE, CALL_OUT_STATE, OUTGOING_STATE } from '../../stateMachines/callStateMachine'

export enum PhoneCallStatus {
  EMITTED = 'EMITTED',
  RECEIVED = 'RECEIVED',
  MISSED = 'MISSED',
}

export interface HistoryStore {
  user: string
  list: PhoneHistory[]
}

export interface PhoneHistory {
  number: string,
  date: number, // timestamp
  status: PhoneCallStatus,
  duration: number,
}

interface HistoryProps {
  currentUser: string
  save: (payload: {[key: string]: any}) => void
  historySize?: number
}

export class History {
  private _user: string = ''
  list: PhoneHistory[] = []
  save: (payload: {[key: string]: any}) => void
  historySize: number = 50 // number of calls to keep

  set store(store: HistoryStore | undefined) {
    console.log('SET STORE', store)
    this.list = store ? store.list : []
    this.user = store ? store.user : ''
  }

  get user() {
    return this._user
  }
  set user(user: string) {
    if (this.user !== user) {
      console.log('THE USER IS DIFFERENT !')
      this.save({ user, list: [] })
    }
    this._user = user
  }

  constructor(props: HistoryProps) {
    this.save = props.save

    if (props.currentUser) {
      this.user = props.currentUser
    }

    if (props.historySize) {
      this.historySize = props.historySize
    }
  }

  statusForState(fromState: CallState): PhoneCallStatus | undefined {
    if (fromState === INCOMING_STATE) {
      return PhoneCallStatus.MISSED
    }
    if (fromState === ANSWERED_STATE) {
      return PhoneCallStatus.RECEIVED
    }
    if (fromState === CALL_OUT_STATE || fromState === OUTGOING_STATE) {
      return PhoneCallStatus.EMITTED
    }

    return undefined
  }

  addToHistory(phoneHistory: PhoneHistory) {
    this.save({ user: this.user, list: [...this.list, phoneHistory].slice(-this.historySize) })
  }
}
