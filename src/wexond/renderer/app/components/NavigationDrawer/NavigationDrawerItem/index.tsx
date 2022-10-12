import * as React from 'react';
import ensureIcon from '../../../utils/ensureIcon'
import { StyledNavigationDrawerItem, Icon } from './style';

export const NavigationDrawerItem = ({
  children,
  selected,
  onClick,
  icon,
}: {
  children: any;
  selected?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  icon?: string;
}): JSX.Element => {
  return (
    <StyledNavigationDrawerItem selected={selected} onClick={onClick}>
      {icon && <Icon style={{ backgroundImage: `url(${ensureIcon(icon)})` }} />}
      {children}
    </StyledNavigationDrawerItem>
  );
};
