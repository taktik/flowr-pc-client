import * as React from 'react'
import { Incoming } from './incoming'
import { Unavailable } from './unavailable'
import { OffHook } from './offHook'
import { Calling } from './calling'
import { CallState, OFF_HOOK_STATE, INCOMING_STATE, ANSWERED_STATE, CALL_OUT_STATE, OUTGOING_STATE } from '../stateMachines/callStateMachine'
import styled from 'styled-components'
import { robotoRegular } from '.'
import { Translator } from '../../../translator/translator'
import { PhoneCapabilities, CallingNumber } from './phone'
import { HistoryView } from './history'
import { PhoneHistory } from '../features/history'
import { FavoritesView } from './favorites'
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

enum PhoneRoute {
  MAIN,
  HISTORY,
  FAVORITES,
}

interface MainViewProps {
  callState: CallState | null
  waiting: boolean
  translator: Translator
  lang?: string
  callingNumber: CallingNumber
  messagingNumber: string
  capabilities: {[key: string]: boolean} | undefined
  history: PhoneHistory[] | undefined
  favorites: CallingNumber[] | undefined
  elapsedTime: number
  call: (callNumber: CallingNumber) => void
  sendKey: (key: string) => void
  answer: () => void
  hangup: () => void
  mute: () => void
  removeFavorite: (phoneNumber: CallingNumber) => void
  saveFavorite: (favorite: CallingNumber) => void
  openKeyboard?: () => void
  closeKeyboard?: () => void
  hidePhone?: () => void
}

interface MainViewState {
  route: PhoneRoute
  callNumber?: CallingNumber
}

const StyledCalling = styled(Calling)`
  height: 50%;
  width: 100%;
  ${robotoRegular}
  box-sizing: border-box;
`

const Container = styled.div `
  position: absolute;
  height: 440px;
  width: 880px;
  top: 50%;
  left: 50%;
  transform: translate(-50%,-50%);
`

const UpperRightIcon = styled(FontAwesomeIcon)`
  width: 36px;
`

export class MainView extends React.Component<MainViewProps, MainViewState> {
  private _translator: Translator = new Translator()
  constructor(props: MainViewProps) {
    super(props)
    this.state = { route: PhoneRoute.MAIN, callNumber: { value: '' } }
  }

  goToPage(route: PhoneRoute) {
    return (callNumber?: CallingNumber): void => this.setState({ route, callNumber })
  }

  call(callNumber: CallingNumber) {
    this.props.call(callNumber)
    this.setState({ callNumber: { value: '' } })
  }

  baseTemplateForRoute(): JSX.Element {
    switch (this.state.route) {
      case PhoneRoute.HISTORY:
        if (this.props.history) {
          return (<HistoryView phoneCalls={this.props.history} favorites={this.props.favorites} select={this.goToPage(PhoneRoute.MAIN)} translator={this.props.translator} lang={this.props.lang}/>)
        }
      case PhoneRoute.FAVORITES:
        if (this.props.favorites) {
          return (<FavoritesView
            favorites={this.props.favorites}
            select={this.goToPage(PhoneRoute.MAIN)}
            translator={this.props.translator}
            lang={this.props.lang}
            openKeyboard={this.props.openKeyboard}
            closeKeyboard={this.props.closeKeyboard}
            remove={this.props.removeFavorite}
            save={this.props.saveFavorite}
          />)
        }
      case PhoneRoute.MAIN:
      default:
        return (<OffHook
          translator={this.props.translator}
          lang={this.props.lang}
          call={this.call.bind(this)}
          messagingNumber={this.props.messagingNumber}
          callNumber={this.state.callNumber}
          goToHistory={this.goToPage(PhoneRoute.HISTORY)}
          goToFavorites={this.goToPage(PhoneRoute.FAVORITES)}
        />)
    }
  }

  baseCallingProps() {
    return {
      translator: this.props.translator,
      lang: this.props.lang,
      hangup: this.props.hangup,
      mute: this.props.mute,
      callingNumber: this.props.callingNumber,
      elapsedTime: this.props.elapsedTime,
    }
  }

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
        template = templateIfCapable(this.baseTemplateForRoute(), PhoneCapabilities.EMIT)
        break
      case INCOMING_STATE:
        template = templateIfCapable((<Incoming answer={this.props.answer} hangup={this.props.hangup} translator={this.props.translator} lang={this.props.lang} callingNumber={this.props.callingNumber}/>), PhoneCapabilities.RECEIVE)
        break
      case ANSWERED_STATE:
        template = templateIfCapable((<StyledCalling mode={ANSWERED_STATE} sendKey={this.props.sendKey} {...this.baseCallingProps()}/>), PhoneCapabilities.RECEIVE)
        break
      case CALL_OUT_STATE:
        template = templateIfCapable((<StyledCalling mode={CALL_OUT_STATE} sendKey={this.props.sendKey} {...this.baseCallingProps()}/>), PhoneCapabilities.EMIT)
        break
      case OUTGOING_STATE:
        template = templateIfCapable((<StyledCalling mode={OUTGOING_STATE} {...this.baseCallingProps()}/>), PhoneCapabilities.EMIT)
        break
      default:
        template = unavailableTemplate
    }
    return (
        <Container>
          <>
            {template}
            <div className="close-btn" onClick={this.props.hidePhone}>
              <UpperRightIcon icon="times" />
              <span>{this._translator.translate('Close', this.props.lang)}</span>
            </div>
          </>
        </Container>
    )
  }
}
