import * as React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { CALL_OUT_STATE, ANSWERED_STATE, CallState, OUTGOING_STATE } from '../../stateMachines/callStateMachine'
import styled from 'styled-components'
import { HangupPhoneIcon } from '../phoneButtons'
import { FlexRowCenter } from '../flex'
import { Translator } from '../../../../translator/translator'
import { formatElapsedTime } from '../../helper/time'

import './Calling.css'
import { robotoMedium } from '..'
import { RemoteCodes } from '../../remote'
import { Keyboard } from '../keyboard'
import { KeyPadIcon } from '../otherButtons'

interface CallingProps {
  mode: CallState
  hangup: () => void
  mute: () => void
  sendKey?: (value: string) => void
  className?: string
  translator: Translator
  lang?: string
  number?: string
  callingNumber: string
  elapsedTime: number
}

interface CallingState {
  displayKeyPad: boolean
}

const ElapsedTime = styled(FlexRowCenter)`
  color: white;
  font-size: 24px;
  font-family: 'Roboto', Arial, Helvetica, sans-serif;
  font-weight: regular;
  text-align: center;
  width: 100%;
`

const Rotating = styled(FontAwesomeIcon)`
  width: 40px;
  color: white;
  animation: rotate 2s linear infinite;
  @keyframes rotate {
    100% {
      transform: rotate(360deg);
    }
  }
`

const PhoneNumber = styled.h1`
  color: white;
  ${robotoMedium}
  margin: 0;
`

export class Calling extends React.Component<CallingProps, CallingState> {
  private onKeyDown(e: KeyboardEvent) {
    if (e.code === RemoteCodes.HANGUP_GESTURE || e.code === RemoteCodes.HANGUP_KEY) {
      this.props.hangup()
    }
  }

  constructor(props: CallingProps) {
    super(props)
    this.state = { displayKeyPad: false }

    this.onKeyDown = this.onKeyDown.bind(this)
  }

  toggleKeyboard() {
    this.setState(state => ({ displayKeyPad: !state.displayKeyPad }))
  }

  render() {
    let title
    let elapsedTime

    if ([ANSWERED_STATE, CALL_OUT_STATE].includes(this.props.mode)) {
      elapsedTime = (<ElapsedTime><span>{formatElapsedTime(this.props.elapsedTime)}</span></ElapsedTime>)
    } else {
      elapsedTime = (<Rotating icon="circle-notch" spin />)
    }

    if ([OUTGOING_STATE, CALL_OUT_STATE].includes(this.props.mode)) {
      title = (
        <h2 className="title">{this.props.translator.translate('Calling', this.props.lang)}</h2>
      )
    } else if (this.props.mode === ANSWERED_STATE) {
      title = (
        <h2 className="title">{this.props.translator.translate('Answered', this.props.lang)}...</h2>
      )
    } else {
      title = (<h2 className="title"></h2>)
    }

    let keyboard

    if (this.props.sendKey && this.state.displayKeyPad) {
      keyboard = (<div className="keyboard"><Keyboard keyPressed={this.props.sendKey.bind(this)}/></div>)
    } else {
      keyboard = (<div className="keyboard"></div>)
    }

    return (
      <div className="calling-container">
        {title}
        <PhoneNumber>{this.props.callingNumber}</PhoneNumber>
        { elapsedTime }
        <div className="flex-container">
          <div className="flex-column">
            {/* <FlexRowCenter className={this.props.className}>
              {<div>
                <MuteMicIcon mute={this.props.mute}/>
                <span className="buttonSpan">Mute</span>
              </div>
              <div>
                <KeyPadIcon displayKeyPad={this.toggleKeyboard.bind(this)}/>
                <span className="buttonSpan">Keypad</span>
              </div>
              <div>
                <SpeakerIcon speaker={this.props.speaker}/>
                <span className="buttonSpan disabled">Speaker</span>
              </div>}
            </FlexRowCenter> */}

            <div className="buttonContainer">
              <KeyPadIcon displayKeyPad={this.toggleKeyboard.bind(this)}/>
              <span className="buttonSpan">Keypad</span>
            </div>
            <div className="buttonContainer">
              <HangupPhoneIcon hangup={this.props.hangup} />
              <span className="buttonSpan">{this.props.translator.translate('Hang Up', this.props.lang)}</span>
            </div>
          </div>
          {keyboard}
        </div>
      </div>
    )
  }

  componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown)
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown)
  }
}
