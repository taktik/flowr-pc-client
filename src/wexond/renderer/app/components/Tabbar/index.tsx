import { observer } from 'mobx-react';
import * as React from 'react';

import HorizontalScrollbar from '../HorizontalScrollbar';
import store from '~/renderer/app/store';
import { icons } from '~/renderer/app/constants/icons'
import { TOOLBAR_ICON_HEIGHT } from '~/renderer/app/constants/design';;
import { AddTab, StyledTabbar, TabsContainer } from './style';
import { Tabs } from '../Tabs';
import { ipcRenderer } from 'electron';

const getContainer = () => store.tabs.containerRef.current;

const onMouseEnter = () => (store.tabs.scrollbarVisible = true);

const onMouseLeave = () => (store.tabs.scrollbarVisible = false);

const onAddTabClick = (e:React.MouseEvent) => {
  e.stopPropagation()
  store.tabs.onNewTab()
  setTimeout(() => document.getElementById('search-box-input').focus(), 100)

}

export const Tabbar = observer(() => {
  return (
    <StyledTabbar>
      <TabsContainer
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        ref={store.tabs.containerRef}
      >
        <Tabs />
      </TabsContainer>
      { !store.tabs.isMaxTab && <AddTab
        style={{backgroundColor: store.overlay.isNewTab ?
            'rgb(227, 237, 243)'
            :  'transparent',
        }}
        icon={icons.add}
        size={TOOLBAR_ICON_HEIGHT}
        onMouseDown={onAddTabClick}
        divRef={(r: any) => (store.addTab.ref = r)}
      />}
      <HorizontalScrollbar
        ref={store.tabs.scrollbarRef}
        enabled={store.tabs.scrollable}
        visible={store.tabs.scrollbarVisible}
        getContainer={getContainer}
      />
    </StyledTabbar>
  );
});
