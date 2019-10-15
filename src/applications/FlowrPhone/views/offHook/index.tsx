import * as React from 'react'
import { AnswerPhoneIcon } from '../phoneButtons'
import styled from 'styled-components'
import { throttle } from '../../helper/throttle'
import { Translator } from '../../../../translator/translator'
import { Keyboard } from '../keyboard'
import { ClickableIcon } from '../clickableIcon'

import './OffHook.css'
import { RemoteCodes } from '../../remote'
import { CallingNumber } from '../phone'

type CallFunction = (callNumber: CallingNumber) => void

interface OffHookProps {
  call: CallFunction
  translator: Translator
  lang?: string
  callNumber?: CallingNumber
  goToHistory: () => void
}

interface OffHookState {
  callNumber: CallingNumber
}

const numberValidationRegExp = /^\+?[0-9]*$/

const StyledIcon = styled(ClickableIcon)`
  width: 36px;
`

export class OffHook extends React.Component<OffHookProps, OffHookState> {
  constructor(props: OffHookProps) {
    super(props)
    this.state = { callNumber: props.callNumber || { value: '' } }

    this.handleChange = this.handleChange.bind(this)
    this.onKeyDown = this.onKeyDown.bind(this)
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.keyCode === 13 || e.code === RemoteCodes.ANSWER_KEY) {
      this.call()
    } else if (/[0-9]/.test(e.key.toString())) {
      this.addNumber(e.key.toString())
    } else if (e.key === 'Backspace' || e.code === RemoteCodes.BACK) {
      this.removeNumber()
    }
  }

  private addNumber(value: string) {
    this.setState(state => ({ callNumber: { value: `${state.callNumber.value}${value}` } }))
  }

  private removeNumber() {
    this.setState(state => ({ callNumber: { value: state.callNumber.value.slice(0, -1) } }))
  }

  @throttle(1000)
  call() {
    this.props.call(this.state.callNumber)
  }

  handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (numberValidationRegExp.test(e.target.value)) {
      this.setState({ callNumber: { value: e.target.value } })
    }
  }

  render() {
    return (
      <div className="offHook-container">
        <div className="top-container">
          <label className="label">{this.props.translator.translate('Number', this.props.lang)}</label>
          <div className="input-container">
            <input id="callNumber" className="number" type="string" value={this.state.callNumber.value} onChange={this.handleChange} onKeyDown={e => e.preventDefault()} autoFocus />
            <StyledIcon className="input-icon" icon="backspace" onClick={this.removeNumber.bind(this)} />
          </div>
        </div>
        <div className="container-flex">
          <div className="left"><Keyboard keyPressed={this.addNumber.bind(this)} /></div>
          <div className="right">
            <AnswerPhoneIcon answer={this.call.bind(this)} />
            <div className="helper">
              <span>{this.props.translator.translate('Press 0 for external calls', this.props.lang)}<br/></span>
              <span>{this.props.translator.translate('Enter the number and press the green button to start the call', this.props.lang)}<br/></span>
              <span>{this.props.translator.translate('To hang up, hang up the phone or press the red button', this.props.lang)}<br/></span>
              <br/>
              <div>{this.props.translator.translate('Extra credit is necessary for all phone call towards mobiles, international numbers or special numbers', this.props.lang)}</div>
            </div>
          </div>
        </div>
        <div className="extra-btn-container">
          <div onClick={this.props.goToHistory}><StyledIcon className="extra-btn-icon" icon="history" onClick={this.removeNumber.bind(this)} /></div>
          <div onClick={this.props.goToHistory}><StyledIcon className="extra-btn-icon" icon="voicemail" onClick={this.removeNumber.bind(this)} /></div>
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
