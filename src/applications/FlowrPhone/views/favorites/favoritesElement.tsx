import * as React from 'react'
import { CallingNumber } from '../phone'
import { ClickableIcon } from '../clickableIcon'
import styled from 'styled-components'

interface FavoritesElementProps {
  favorite: CallingNumber
  select: (phoneNumber: CallingNumber) => void
  remove: (phoneNumber: CallingNumber) => void
  edit: (phoneNumber: CallingNumber) => void
}

const StyledIcon = styled(ClickableIcon)`
  width: 24px;
`

export class FavoritesElement extends React.Component<FavoritesElementProps> {
  private get favorite(): CallingNumber {
    return typeof this.props.favorite === 'string' ? { value: this.props.favorite } : this.props.favorite
  }

  select() {
    this.props.select(this.favorite)
  }

  remove(e: Event) {
    e.stopPropagation()
    this.props.remove(this.favorite)
  }

  edit(e: Event) {
    e.stopPropagation()
    this.props.edit(this.favorite)
  }

  render() {
    return (
      <div onClick={this.select.bind(this)} className="favorites-element">
        <StyledIcon icon="trash" onClick={this.remove.bind(this)}></StyledIcon>
        <div className="title">{this.props.favorite.name}</div>
        <div className="number">{this.props.favorite.value}</div>
        <StyledIcon icon="pen" onClick={this.edit.bind(this)}></StyledIcon>
      </div>
    )
  }
}
