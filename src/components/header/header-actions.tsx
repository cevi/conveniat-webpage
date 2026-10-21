'use client';

import { DynamicAppTitleName } from '@/components/header/dynamic-app-title-name';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';

const HeaderActionsContext = createContext<ReactNode>(undefined);
const SetHeaderActionsContext = createContext<(actions: ReactNode) => void>(() => {});

/** Holds the buttons the current page shows on the right of the app header. */
export const HeaderActionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [actions, setActions] = useState<ReactNode>();
  return (
    <SetHeaderActionsContext.Provider value={setActions}>
      <HeaderActionsContext.Provider value={actions}>{children}</HeaderActionsContext.Provider>
    </SetHeaderActionsContext.Provider>
  );
};

/**
 * Puts buttons on the right of the app header while the page is shown. A page that sets them,
 * even none, gets its title on the left next to the menu, the way the app's main pages have it.
 */
export const SetHeaderActions: React.FC<{ children?: ReactNode }> = ({ children }) => {
  const setActions = useContext(SetHeaderActionsContext);
  useEffect(() => {
    setActions(children ?? <></>);
  }, [children, setActions]);
  useEffect(() => (): void => setActions(undefined), [setActions]);
  return <></>;
};

/** The title of the app header, centred, or on the left with the page's buttons on the right. */
export const AppHeaderTitle: React.FC = () => {
  const actions = useContext(HeaderActionsContext);

  if (actions === undefined) {
    return (
      <span className="absolute top-[16px] left-0 flex w-full items-center justify-center font-['Montserrat'] text-[24px] leading-normal font-extrabold xl:hidden">
        <DynamicAppTitleName />
      </span>
    );
  }

  return (
    <>
      <span className="absolute top-0 left-[60px] flex h-[60px] items-center font-['Montserrat'] text-[22px] leading-none font-extrabold xl:hidden">
        <DynamicAppTitleName />
      </span>
      <div className="absolute top-0 right-2 z-[105] flex h-[60px] items-center">{actions}</div>
    </>
  );
};
