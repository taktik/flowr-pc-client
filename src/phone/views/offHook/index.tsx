import * as React from 'react'
import { AnswerPhoneIcon } from '../phoneButtons'
import { FlexColumnCenter } from '../flex'
import { throttle } from '../../helper/throttle'

type CallFunction = (callNumber: string) => void

interface OffHookProps {
  call: CallFunction
}

interface OffHookState {
  callNumber: string
}

const numberValidationRegExp = /^\+?[0-9]*$/

export class OffHook extends React.Component<OffHookProps, OffHookState> {
  constructor(props: OffHookProps) {
    super(props)
    this.state = { callNumber: '' }
  }

  private onKeyDown(e: KeyboardEvent) {
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
      <FlexColumnCenter>
        <label htmlFor="callNumber">Number</label>
        <input id="callNumber" type="string" value={this.state.callNumber} onChange={this.handleChange.bind(this)} onKeyDown={this.onKeyDown.bind(this)} />
        <AnswerPhoneIcon answer={this.call.bind(this)} />
      </FlexColumnCenter>
    )
  }
}
