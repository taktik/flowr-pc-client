import { observer } from 'mobx-react'
import * as React from 'react'

import store from '~/renderer/app/store'
import { StyledToolbar, Buttons } from './style'
import { NavigationButtons } from '../NavigationButtons'
import { Tabbar } from '../Tabbar'
import ToolbarButton from '../ToolbarButton'
import { icons, TOOLBAR_ICON_HEIGHT } from '../../constants'
import { ipcRenderer } from 'electron'
import { Find } from '../Find'
import { backToFlowr } from '~/renderer/app/utils'
import { VirtualKeyboardEvent } from '../../../../../keyboard/events'
import { Toolbar } from '../../models/toolbar'

const onUpdateClick = () => {
  ipcRenderer.send('update-install')
}

@observer
class BrowserActions extends React.Component {
  public render() {
    return (<></>)
  }
}

export default observer((data: Toolbar) => {
  const onHomePress = () => {
    backToFlowr()
  }

  const onKeyboardPress = () => {
    ipcRenderer.send(VirtualKeyboardEvent.TOGGLE)
  }

  return (
      <StyledToolbar isHTMLFullscreen={store.isHTMLFullscreen}>
        <NavigationButtons />
        {!data.disableTabs && (
          <>
            <Tabbar />
            <Find />
          </>
        )}
        <Buttons>
          <BrowserActions />
          {store.updateInfo.available && (
            <ToolbarButton icon={icons.download} onClick={onUpdateClick} />
          )}
          <ToolbarButton
            disabled={false}
            size={TOOLBAR_ICON_HEIGHT}
            icon={icons.home}
            onClick={onHomePress}
          />
          {data.enableVirtualKeyboard && <ToolbarButton
            disabled={false}
            size={TOOLBAR_ICON_HEIGHT}
            icon={icons.keyboard}
            onClick={onKeyboardPress}
          />}
        </Buttons>
      </StyledToolbar>
  )
})
