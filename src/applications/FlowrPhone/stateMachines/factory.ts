import { RegisterProps, CallingNumber } from '../views/phone'
import { Dispatcher } from './dispatcher'
import { RegisterStateMachine } from './registerStateMachine'
import { CallStateMachine } from './callStateMachine'

export class PhoneStateMachine {
  static factory(
    phoneServer: string | null,
    registerProps: RegisterProps | null,
    callingNumberChanged: (callingNumber: CallingNumber) => void,
    canReceiveCalls: boolean,
  ): {registerStateMachine: RegisterStateMachine, callStateMachine: CallStateMachine } {
    const dispatcher = new Dispatcher(phoneServer)
    const registerStateMachine = new RegisterStateMachine(dispatcher, registerProps, canReceiveCalls)
    const callStateMachine = new CallStateMachine(dispatcher, callingNumberChanged)
    dispatcher.setup(registerStateMachine, callStateMachine)
    return { registerStateMachine, callStateMachine }
  }
}
