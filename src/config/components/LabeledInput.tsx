import * as React from 'react'
import type { FieldPath, UseFormRegister, RegisterOptions } from 'react-hook-form'
import styled from 'styled-components'
import { ModifiableConfig } from '../../frontend/src/interfaces/flowrStore'

type TextInputProps<T extends ModifiableConfig, U extends FieldPath<T>> = RegisterOptions<T, U> & {
    type?: string
    label: string
    register: UseFormRegister<T>
    path: U
}

const FlexRowDiv = styled('div')`
    display: flex;
    flex-direction: row;
`

export function LabeledInput<U extends ModifiableConfig, T extends FieldPath<U>>(props: TextInputProps<U, T>): JSX.Element {
    return <FlexRowDiv>
        <div className="config-label">{props.label}</div>
        <input type={props.type ?? 'text'} {...props.register(props.path, props)}></input>
    </FlexRowDiv>
}
