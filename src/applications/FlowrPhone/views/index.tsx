import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Phone } from './phone'
import styled from 'styled-components'
import { fonts } from '../fonts'

const StyledPhone = styled(Phone)`
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: transparent;
  display: flex;
  justify-content: center;
  align-items: center;
  top: 0;
  left: 0;
  &:before {
    position: fixed;
    top: 0;
    left: 0;
    z-index: -1;
    content: '';
    height: 100%;
    width: 100%;
    display: block;
    background: rgba(255,255,255,0.8);
  }
`
const styleElement = document.createElement('style')

styleElement.textContent = `
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400;
  src: url(${fonts.robotoRegular}) format('woff2');
}
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 500;
  src: url(${fonts.robotoMedium}) format('woff2');
}
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 300;
  src: url(${fonts.robotoLight}) format('woff2');
}
`
export const robotoLight = () => `
  font-family: Roboto;
  font-weight: 300;
`

export const robotoRegular = () => `
  font-family: Roboto;
  font-weight: 400;
`

export const robotoMedium = () => `
  font-family: Roboto;
  font-weight: 500;
`

document.head.appendChild(styleElement)

window.ipcRenderer.on('initPropsReply', (evt, props) => {
  ReactDOM.render(<StyledPhone
      capabilities={props.capabilities}
      currentUser={props.currentUser}
      favorites={props.favorites}
      history={props.history}
      lang={props.lang}
      phoneServer={props.server}
      registerProps={props.registerProps}
  />, document.getElementById('phone'))
})
window.ipcRenderer.send('initProps')
