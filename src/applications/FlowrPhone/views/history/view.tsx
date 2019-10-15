import * as React from 'react'
import { PhoneFavorite } from '../favorites'
import { HistoryElement } from './historyElement'
import { PhoneHistory } from '.'
import { ClickableIcon } from '../clickableIcon'
import { CallingNumber } from '../phone'
import styled from 'styled-components'

interface HistoryProps {
  phoneCalls: PhoneHistory[]
  favorites: PhoneFavorite[]
  select: (phoneNumber: CallingNumber) => void
}

const StyledIcon = styled(ClickableIcon)`
  width: 24px;
`

export class HistoryView extends React.Component<HistoryProps> {
  findFavoriteForNumber(phoneNumber: CallingNumber | string): PhoneFavorite | undefined {
    const value = typeof phoneNumber === 'string' ? phoneNumber : phoneNumber.value
    return this.props.favorites.find(favorite => favorite.number === value)
  }

  back() {
    this.props.select({ value: '' })
  }

  render() {
    return (
      <div className="history-container">
        <div className="backbtn" onClick={this.back.bind(this)}><StyledIcon className="extra-btn-icon" icon="arrow-left" onClick={this.back.bind(this)} /></div>
        {
          this.props.phoneCalls.map(call => (<HistoryElement favorite={this.findFavoriteForNumber(call.number)} select={this.props.select} {...call} key={`${call.number}-${call.date}`}></HistoryElement>))
        }
      </div>
    )
  }
}
