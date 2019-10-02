import * as React from 'react'
import { Incoming } from './incoming'
import { Unavailable } from './unavailable'
import { OffHook } from './offHook'
import { Calling } from './calling'
import { CallState, OFF_HOOK_STATE, INCOMING_STATE, ANSWERED_STATE, CALL_OUT_STATE, OUTGOING_STATE } from '../stateMachines/callStateMachine'
import styled from 'styled-components'
import { robotoRegular } from '.'
import { Translator } from '../../../translator/translator'
import { PhoneCapabilities } from './phone'

interface MainViewProps {
  callState: CallState | null
  call: (callNumber: string) => void
  answer: () => void
  hangup: () => void
  mute: () => void
  waiting: boolean
  translator: Translator
  lang?: string
  number?: string
  callingNumber: string
  capabilities: {[key: string]: boolean} | undefined
}

const StyledCalling = styled(Calling)`
  height: 50%;
  width: 100%;
  ${robotoRegular}
  box-sizing: border-box;
`

export class MainView extends React.Component<MainViewProps> {
  render() {
    let template: JSX.Element

    const unavailableTemplate = (<Unavailable translator={this.props.translator} lang={this.props.lang} />)

    const templateIfCapable = (template: JSX.Element, capability: PhoneCapabilities): JSX.Element => {
      if (!this.props.capabilities || this.props.capabilities[capability]) {
        return template
      }
      console.log('FORBIDDEN', this.props.capabilities, capability)
      return unavailableTemplate
    }

    switch (this.props.callState) {
      case OFF_HOOK_STATE:
        template = templateIfCapable((<OffHook translator={this.props.translator} lang={this.props.lang} call={this.props.call} />), PhoneCapabilities.EMIT)
        break
      case INCOMING_STATE:
        template = templateIfCapable((<Incoming answer={this.props.answer} hangup={this.props.hangup} translator={this.props.translator} lang={this.props.lang}/>), PhoneCapabilities.RECEIVE)
        break
      case ANSWERED_STATE:
        template = templateIfCapable((<StyledCalling mode={ANSWERED_STATE} translator={this.props.translator} lang={this.props.lang} hangup={this.props.hangup} mute={this.props.mute} number={this.props.number} callingNumber={this.props.callingNumber}/>), PhoneCapabilities.RECEIVE)
        break
      case CALL_OUT_STATE:
        template = templateIfCapable((<StyledCalling mode={CALL_OUT_STATE} translator={this.props.translator} lang={this.props.lang} hangup={this.props.hangup} mute={this.props.mute} number={this.props.number} callingNumber={this.props.callingNumber}/>), PhoneCapabilities.EMIT)
        break
      case OUTGOING_STATE:
        template = templateIfCapable((<StyledCalling mode={OUTGOING_STATE} translator={this.props.translator} lang={this.props.lang} hangup={this.props.hangup} mute={this.props.mute} number={this.props.number} callingNumber={this.props.callingNumber}/>), PhoneCapabilities.EMIT)
        break
      default:
        template = unavailableTemplate
    }
    return template
  }
}
