import * as React from 'react'
import { PhoneHistory, PhoneCallStatus } from '.'
import { PhoneFavorite } from '../favorites'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { formatElapsedTime, formatDate } from '../../helper/time'
import styled from 'styled-components'

interface HistoryElementProps extends PhoneHistory {
  favorite?: PhoneFavorite
  select: (phoneNumber: string) => void
}


const StyledIcon = styled(FontAwesomeIcon)`
  width: 36px;
`

export class HistoryElement extends React.Component<HistoryElementProps> {
  select() {
    this.props.select(this.props.number)
  }

  header(): JSX.Element {
    if (this.props.favorite) {
      return (<div className="header">
        <div className="title">{this.props.favorite.name}</div>
        <div className="number">{this.props.favorite.number}</div>
      </div>)
    }
    return (<div className="header"><div className="title number">{this.props.number}</div></div>)
  }

  phoneStatusIcon(): JSX.Element {
    switch (this.props.status) {
      case PhoneCallStatus.EMITTED:
        return (<StyledIcon icon="long-arrow-alt-right"></StyledIcon>)
      case PhoneCallStatus.MISSED:
      case PhoneCallStatus.RECEIVED:
        return (<StyledIcon icon="long-arrow-alt-left"></StyledIcon>)
      default:
        return (<div></div>)
    }
  }

  render() {
    return (
      <div onClick={this.select.bind(this)} className="history-element">
        <div className="statusIcon">{this.phoneStatusIcon()}</div>
        {this.header()}
        <div className="date"><span>{formatDate(this.props.date)}</span></div>
        <div className="elapsedTime">{formatElapsedTime(this.props.duration)}</div>
      </div>
    )
  }
}
