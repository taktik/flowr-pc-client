import * as React from 'react'
import { CallingNumber } from '../phone'
import { Translator } from '../../../../translator/translator'
import { RemoteCodes } from '../../remote'
import { numberValidationRegExp } from '../../helper/format'
import { ClickableIcon } from '../clickableIcon'
import styled from 'styled-components'

export interface AddFavoriteProps {
  name?: string
  value?: string
  translator: Translator
  lang?: string
  back: () => void
  save: (favorite: CallingNumber) => void
  openKeyboard?: () => void
  closeKeyboard?: () => void
}

interface AddFavoriteState {
  name: string
  value: string
}

const StyledIcon = styled(ClickableIcon)`
  color: #56DE6F;
  width: 56px;
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

  save() {
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

  handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ name: e.target.value })
  }

  handleNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (numberValidationRegExp.test(e.target.value)) {
      this.setState({ value: e.target.value })
    }
  }

  render() {
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

  componentWillMount() {
    document.addEventListener('keydown', this.globalOnKeyDown)
    if (this.props.openKeyboard) {
      this.props.openKeyboard()
    }
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.globalOnKeyDown)
    if (this.props.closeKeyboard) {
      this.props.closeKeyboard()
    }
  }
}
