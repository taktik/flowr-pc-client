import * as React from 'react'
import { FlexRowSpaceEvenly } from '../flex'
import { AnswerPhoneIcon, HangupPhoneIcon } from '../phoneButtons'
import './Incoming.css'
import { RemoteCodes } from '../../remote'
import { Translator } from '../../../../translator/translator'

interface IncomingProps {
  answer: () => void
  hangup: () => void
  translator: Translator
  lang?: string
  callingNumber: string
}

export class Incoming extends React.Component<IncomingProps> {
  private onKeyDown(e: KeyboardEvent) {
    if (e.keyCode === 13 || e.code === RemoteCodes.ANSWER_KEY || e.code === RemoteCodes.ANSWER_GESTURE) {
      this.props.answer()
    } else if (e.code === RemoteCodes.HANGUP_KEY || e.code === RemoteCodes.HANGUP_GESTURE) {
      this.props.hangup()
    }
  }

  constructor(props: IncomingProps) {
    super(props)
    this.onKeyDown = this.onKeyDown.bind(this)
  }

  callingNumber(): JSX.Element {
    return (<h1 className="phoneNumber">{this.props.callingNumber || ''}</h1>)
  }

  render() {
    return (
      <div className="incoming-call-container">
        <h2 className="title">{this.props.translator.translate('Incoming Call', this.props.lang)}</h2>
        <h1 className="phoneNumber">{this.props.callingNumber || ''}</h1>
        <FlexRowSpaceEvenly>
          <div className="buttonContainer">
            <AnswerPhoneIcon answer={this.props.answer} />
            <span className="buttonSpan">{this.props.translator.translate('Accept', this.props.lang)}</span>
          </div>
          <div className="buttonContainer">
            <HangupPhoneIcon hangup={this.props.hangup} />
            <span className="buttonSpan">{this.props.translator.translate('Decline', this.props.lang)}</span>
          </div>
        </FlexRowSpaceEvenly>
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
