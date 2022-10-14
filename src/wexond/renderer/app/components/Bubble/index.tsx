import * as React from 'react'
import { StyledBubble, Title, Icon, Circle, StyledClose } from './style'
import { observer } from 'mobx-react'
import ensureIcon from '../../utils/ensureIcon'

export const getSize = (i: number): number => {
  const width = 800
  return (width - 48 - (i - 1)) / i
}

const Close = observer(({ onCloseClick }: { onCloseClick: any }) => {
  return (
    <StyledClose
      onClick={onCloseClick}
    />
  )
})
export const Bubble = ({
  children,
  icon,
  invert,
  maxLines,
  iconSize,
  onClick,
  toggled,
  itemsPerRow,
  disabled,
  onCloseClick,
}: {
  children?: JSX.Element
  icon?: string
  invert?: boolean
  maxLines?: number
  iconSize?: number
  onClick?: (e?: React.MouseEvent<HTMLDivElement>) => void
  onCloseClick?: (e?: React.MouseEvent<HTMLDivElement>) => void
  itemsPerRow?: number
  disabled?: boolean
  toggled?: boolean
}): JSX.Element => {
  const width = getSize(itemsPerRow)
  const setIcon = ensureIcon(icon)

  return (
    <StyledBubble
      style={{ minWidth: width, maxWidth: width }}
      disabled={disabled}
      onClick={onClick}
    >
      {onCloseClick && <Close onCloseClick={onCloseClick}/>}
      <Circle toggled={toggled}>
        <Icon
          invert={invert}
          toggled={toggled}
          style={{
            backgroundImage: `url(${setIcon})`,
            backgroundSize: `${iconSize}px`,
          }}
        />
      </Circle>
      <Title
        style={{
          WebkitLineClamp: maxLines,
        }}
      >
        {children}
      </Title>
    </StyledBubble>
  )
}

Bubble.defaultProps = {
  maxLines: 2,
  iconSize: 24,
  itemsPerRow: 7,
}
