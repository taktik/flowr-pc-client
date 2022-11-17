import * as React from 'react'
import { Translator } from '../../../../translator/translator'
import './Unavailable.css'
import styled from "styled-components";

interface Props {
  className?: string
  translator: Translator
  lang?: string
}

const Container = styled.div`
  height:100%;
  width: calc(100% - 80px);
  margin-left: 80px;
  border-radius: 0 8px 8px 8px;
  background: rgba(0,0,0,0.8);
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
`
export const Unavailable = (props: Props) => (
  <Container className={props.className}>
    <h1>{props.translator.translate('Sorry... :(', props.lang)}</h1>
    <p>{props.translator.translate('The phone service is momentarily unavailable, please try again later', props.lang)}</p>.
  </Container>
)
