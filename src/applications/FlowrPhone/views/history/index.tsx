import * as React from 'react'
import { HistoryElement } from './historyElement'
import { PhoneHistory } from '../../features/history'
import { ClickableIcon } from '../clickableIcon'
import { CallingNumber } from '../phone'
import styled from 'styled-components'
import { Translator } from 'src/translator/translator'
import './history.css'

interface HistoryProps {
  phoneCalls: PhoneHistory[]
  favorites: CallingNumber[]
  select: (phoneNumber: CallingNumber) => void
  translator: Translator
  lang?: string
}

const StyledIcon = styled(ClickableIcon)`
  width: 24px;
`

export class HistoryView extends React.Component<HistoryProps> {
  findFavoriteForNumber(phoneNumber: CallingNumber | string): CallingNumber | undefined {
    const value = typeof phoneNumber === 'string' ? phoneNumber : phoneNumber.value
    return this.props.favorites.find(favorite => favorite.value === value)
  }

  back() {
    this.props.select({ value: '' })
  }

  render() {
    return (
      <div className="history-container">
        <div className="backbtn" onClick={this.back.bind(this)}>
          <StyledIcon className="extra-btn-icon" icon="arrow-left" onClick={this.back.bind(this)} />
          <span>{this.props.translator.translate('Back', this.props.lang)}</span>
        </div>
        {
          this.props.phoneCalls.map(call => (<HistoryElement favorite={this.findFavoriteForNumber(call.number)} select={this.props.select} {...call} key={`${call.number}-${call.date}`}></HistoryElement>))
        }
      </div>
    )
  }
}
