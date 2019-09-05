import * as React from 'react'
import { Incoming } from './incoming'
import { Unavailable } from './unavailable'
import { OffHook } from './offHook'
import { Calling } from './calling'
import { CallState, OFF_HOOK_STATE, INCOMING_STATE, ANSWERED_STATE, CALL_OUT_STATE } from '../stateMachines/callStateMachine'
import styled from 'styled-components'
import { robotoRegular } from '~/shared/mixins'
import { Translator } from '../../translator/translator'

interface MainViewProps {
  callState: CallState | null
  call: (callNumber: string) => void
  answer: () => void
  hangup: () => void
  mute: () => void
  speaker: () => void
  displayKeyPad: () => void
  waiting: boolean
  translator: Translator
  lang?: string
}

const StyledCalling = styled(Calling)`
  height: 50%;
  width: 80%;
  ${robotoRegular}
`

export class MainView extends React.Component<MainViewProps> {
  render() {
    let template: JSX.Element
    // this.props.callState 
    switch (OFF_HOOK_STATE) {
      case OFF_HOOK_STATE:
        template = (<OffHook translator={this.props.translator} lang={this.props.lang} call={this.props.call} />)
        break
      case INCOMING_STATE:
        template = (<Incoming answer={this.props.answer} hangup={this.props.hangup} />)
        break
      case ANSWERED_STATE:
        template = (<StyledCalling mode={ANSWERED_STATE} hangup={this.props.hangup} mute={this.props.mute} speaker={this.props.speaker} displayKeyPad={this.props.displayKeyPad}/>)
        break
      case CALL_OUT_STATE:
        template = (<StyledCalling mode={CALL_OUT_STATE} hangup={this.props.hangup} mute={this.props.mute} speaker={this.props.speaker} displayKeyPad={this.props.displayKeyPad}/>)
        break
      default:
        template = (<Unavailable translator={this.props.translator} lang={this.props.lang} />)
    }
    return template
  }
}
