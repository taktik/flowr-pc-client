import * as React from 'react'
import { SubmitErrorHandler, SubmitHandler, useForm, Validate } from 'react-hook-form'
import { LabeledInput } from './components/LabeledInput'
import type { ConfigProps } from './types'
import type { ModifiableConfig } from '../frontend/src/interfaces/flowrStore'
import styled from 'styled-components'

function flexColumn(name: keyof JSX.IntrinsicElements) {
  return styled(name)`
    display: flex;
    flex-direction: column;
  `
}
const ColumnDiv = flexColumn('div')
const ColumnForm = flexColumn('form')
const ActionButton = styled('button')`
  width: 200px;
  height: 50px;
  align-self: center;
  margin: 10px;
`
const FlexRowDiv = styled('div')`
  display: flex;
`

const userAgent = navigator.userAgent
const onValid: SubmitHandler<ModifiableConfig> = (updatedConfig) => {
  ipc.send('setAppConfig', updatedConfig)
}
const close = () => ipc.send('close')
const validateExtUrl: Validate<string> = (value) => {
  try {
    new URL(value)
    return true
  } catch (e) {
    return false
  }
}

export function Config({ config, lastError, isLaunchedUrlCorrect }: ConfigProps): JSX.Element {
  const [ initialError ] = React.useState(lastError)
  const {
    handleSubmit,
    formState: { isDirty },
    register,
    reset,
  } = useForm({
    defaultValues: config,
  })
  const [ urlError, setUrlError ] = React.useState(!isLaunchedUrlCorrect)

  const onError: SubmitErrorHandler<ModifiableConfig> = (e) => {
    if (e.extUrl) {
      setUrlError(true)
    }
  }

  const buttons = isDirty
    ? <>
          <ActionButton type="button" onClick={() => reset(config)}>Reset values</ActionButton>
          <ActionButton type="button" onClick={() => close()}>Exit without saving</ActionButton>
          <ActionButton type="submit">Save and close</ActionButton>
    </>
    : <ActionButton type="button" onClick={() => close()}>Cancel</ActionButton>

  return (
    <ColumnDiv>
      <h1>Settings</h1>
      <h3>Firmware Version : </h3>
      <div id="userAgent">{userAgent}</div>
      <hr></hr>

      {initialError ? (
          <p id="lastError" className="error">{initialError}</p>
        ) : (
          <></>
        )}

      <ColumnForm onSubmit={handleSubmit(onValid, onError)}>
        <h3>External Config</h3>
        <LabeledInput
          label="Url to flowr"
          register={register}
          path="extUrl"
          validate={validateExtUrl}
        ></LabeledInput>
        {urlError ? (
          <span className="error"> Invalid url*</span>
        ) : (
          <></>
        )}
        <LabeledInput
          label="Flowr monitoring timer (use 0 to disable)"
          register={register}
          path="flowrMonitoringTime"
          type="number"
          min="0"
          max="10000000"
          valueAsNumber
        ></LabeledInput>

        <LabeledInput
          label="Activate Kiosk Mode"
          type="checkbox"
          register={register}
          path="isKiosk"
        ></LabeledInput>

        <h3>Configuration</h3>
        <LabeledInput
          label="Ozone API"
          register={register}
          path="flowrConfig.ozoneApi.hostProxy"
        ></LabeledInput>
        <LabeledInput
          label="Flowr API"
          register={register}
          path="flowrConfig.flowrApi.hostProxy"
        ></LabeledInput>
        <LabeledInput
          label="Socket API"
          register={register}
          path="flowrConfig.socketApi.host"
        ></LabeledInput>
        <LabeledInput
          label="Push vod socket API"
          register={register}
          path="flowrConfig.pushVodSocketApi.host"
        ></LabeledInput>
        <LabeledInput
          label="Anevia vod socket API"
          register={register}
          path="flowrConfig.aneviaVodSocketApi.host"
        ></LabeledInput>

        <h3>Deinterlacing</h3>
        <LabeledInput
          label="Activate Deinterlacing"
          type="checkbox"
          register={register}
          path="deinterlacing"
        ></LabeledInput>

        <h3>Applications</h3>
        <LabeledInput
          label="Clear app data on start"
          type="checkbox"
          register={register}
          path="clearAppDataOnStart"
        ></LabeledInput>

        <h3>Virtual keyboard</h3>
        <LabeledInput
          label="Enable virtual keyboard"
          type="checkbox"
          register={register}
          path="enableVirtualKeyboard"
        ></LabeledInput>

        <h3>Debug</h3>
        <LabeledInput
          label="Activate debug mode"
          type="checkbox"
          register={register}
          path="debugMode"
        ></LabeledInput>

        <FlexRowDiv>{ buttons }</FlexRowDiv>
      </ColumnForm>
    </ColumnDiv>
  )
}
