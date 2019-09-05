import * as React from 'react'
import { AnswerPhoneIcon } from '../phoneButtons'
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { throttle } from '../../helper/throttle'
import { Translator } from '../../../translator/translator'
import './OffHook.css'

type CallFunction = (callNumber: string) => void

interface OffHookProps {
  call: CallFunction
  translator: Translator
  lang?: string
}

interface OffHookState {
  callNumber: string
}

const numberValidationRegExp = /^\+?[0-9]*$/

const StyledIcon = styled(FontAwesomeIcon)`
  width: 36px;
`

export class OffHook extends React.Component<OffHookProps, OffHookState> {
  constructor(props: OffHookProps) {
    super(props)
    this.state = { callNumber: '' }
  }

  private onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.keyCode === 13) {
      this.call()
    }
  }

  @throttle(1000)
  call() {
    this.props.call(this.state.callNumber)
  }

  handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (numberValidationRegExp.test(e.target.value)) {
      this.setState({ callNumber: e.target.value })
    }
  }

  render() {
    return (
      <div className="offHook-container">
        <div className="left">
          <div>
            <label className="label">Number</label>
            <div className="input-container">
              <input id="callNumber" className="number" type="string" value={this.state.callNumber} onChange={this.handleChange.bind(this)} onKeyDown={this.onKeyDown.bind(this)} />
              <StyledIcon className="input-icon" icon="backspace" />
            </div>
          </div>
          <AnswerPhoneIcon answer={this.call.bind(this)} />
        </div>
        <div className="right">
        <div className="keyboard">
            <div className="key"><span>1</span></div>
            <div className="key"><span>2</span></div>
            <div className="key"><span>3</span></div>
            <div className="key"><span>4</span></div>
            <div className="key"><span>5</span></div>
            <div className="key"><span>6</span></div>
            <div className="key"><span>7</span></div>
            <div className="key"><span>8</span></div>
            <div className="key"><span>9</span></div>
            <div className="key"><span>#</span></div>
            <div className="key"><span>0</span></div>
            <div className="key"><span>*</span></div>
          </div>
        </div>
      </div>
    )
  }
}
