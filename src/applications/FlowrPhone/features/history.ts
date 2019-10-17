import { CallState, INCOMING_STATE, ANSWERED_STATE, CALL_OUT_STATE, OUTGOING_STATE } from '../stateMachines/callStateMachine'
import { CallingNumber } from '../views/phone'
import { UserStoredFeature } from '.'

export enum PhoneCallStatus {
  EMITTED = 'EMITTED',
  RECEIVED = 'RECEIVED',
  MISSED = 'MISSED',
}

export interface PhoneHistory {
  number: CallingNumber | string,
  date: number, // timestamp
  status: PhoneCallStatus,
  duration: number,
}

export class History extends UserStoredFeature<PhoneHistory> {
  callEnded(fromState: CallState, duration: number, caller: CallingNumber) {
    const status = this.statusForState(fromState)
    if (status) {
      this.add({ date: Date.now(), duration, number: caller, status })
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
}
