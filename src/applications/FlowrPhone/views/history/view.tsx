import * as React from 'react'
import { PhoneFavorite } from '../favorites'
import { HistoryElement } from './historyElement'
import { PhoneHistory } from '.'
import { ClickableIcon } from '../clickableIcon'

import styled from 'styled-components'

interface HistoryProps {
  phoneCalls: PhoneHistory[]
  favorites: PhoneFavorite[]
  select: (phoneNumber: string) => void
}

const StyledIcon = styled(ClickableIcon)`
  width: 24px;
`

export class HistoryView extends React.Component<HistoryProps> {
  findFavoriteForNumber(phoneNumber: string): PhoneFavorite | undefined {
    return this.props.favorites.find(favorite => favorite.number === phoneNumber)
  }

  back() {
    this.props.select('')
  }

  render() {
    return (
      <div className="history-container">
        <div className="backbtn" onClick={this.back.bind(this)}><StyledIcon className="extra-btn-icon" icon="arrow-left" onClick={this.back.bind(this)} /></div>
        {
          this.props.phoneCalls.map(call => (<HistoryElement favorite={this.findFavoriteForNumber(call.number)} select={this.props.select} {...call}></HistoryElement>))
        }
      </div>
    )
  }
}
