import * as React from 'react'
import styled from 'styled-components'
import { Translator } from '../../../../translator/translator'
import { numberValidationRegExp } from '../../helper/format'
import { RemoteCodes } from '../../remote'
import { ClickableIcon } from '../clickableIcon'
import { CallingNumber } from '../phone'

export interface AddFavoriteProps {
  name?: string
  value?: string
  translator: Translator
  lang?: string
  back: () => void
  save: (favorite: CallingNumber) => void
  openKeyboard?: () => void
  closeKeyboard?: () => void
  phoneNumberPrefix?: boolean
}

interface AddFavoriteState {
  name: string
  value: string
}

const StyledIcon = styled(ClickableIcon)`
  color: #56DE6F;
  min-width: 48px;
  height: 48px;
  font-size: 1em;
`

export class AddFavorite extends React.Component<AddFavoriteProps, AddFavoriteState> {
  private nameElement: React.RefObject<HTMLInputElement> = React.createRef()
  private valueElement: React.RefObject<HTMLInputElement> = React.createRef()

  private globalOnKeyDown(e: KeyboardEvent) {
    if (e.keyCode === 13 || e.code === RemoteCodes.ANSWER_KEY) {
      this.save()
    }
    if (e.code === RemoteCodes.BACK) {
      this.props.back()
    }
  }

  constructor(props: AddFavoriteProps) {
    super(props)
    this.globalOnKeyDown = this.globalOnKeyDown.bind(this)
    this.state = { name: this.props.name || '', value: this.props.value || '' }
  }

  save(): void {
    const { name, value } = this.state

    if (!name || !value) {
      if (!name) {
        this.nameElement.current.setAttribute('invalid', '')
      }
      if (!value) {
        this.valueElement.current.setAttribute('invalid', '')
      }
    } else {
      this.props.save({ name, value })
    }
  }

  handleNameChange(e: React.ChangeEvent<HTMLInputElement>): void {
    this.setState({ name: e.target.value })
  }

  handleNumberChange(e: React.ChangeEvent<HTMLInputElement>): void {
    if (numberValidationRegExp.test(e.target.value)) {
      
      if (this.props.phoneNumberPrefix) {
        const value = e.target.value

        // Add a prefix '0' if the first character is not '0' and the value is not empty
        if (value.length > 0 && value.charAt(0) !== '0') {
          e.target.value = '0' + value
        }
      }
      
      this.setState({ value: e.target.value })
    }
  }

  render(): JSX.Element {
    return (
      <div className="add-favorite">
          <label className="label">{this.props.translator.translate('Name', this.props.lang)}</label>
          <div className="input-container">
            <input id="name" className="number" type="text" ref={this.nameElement} value={this.state.name} onChange={this.handleNameChange.bind(this)} autoFocus/>
          </div>
          <label className="label">{this.props.translator.translate('Number', this.props.lang)}</label>
          <div className="input-container">
            <input id="value" className="number" type="text" ref={this.valueElement} value={this.state.value} onChange={this.handleNumberChange.bind(this)}/>
          </div>
          <div className="btnContainer">
            <StyledIcon icon="check-circle" onClick={this.save.bind(this)}></StyledIcon>
          </div>
      </div>
    )
  }

  componentWillMount(): void {
    document.addEventListener('keydown', this.globalOnKeyDown)
    if (this.props.openKeyboard) {
      this.props.openKeyboard()
    }
  }

  componentWillUnmount(): void {
    document.removeEventListener('keydown', this.globalOnKeyDown)
    if (this.props.closeKeyboard) {
      this.props.closeKeyboard()
    }
  }
}
