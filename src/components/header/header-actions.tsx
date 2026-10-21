'use client';

import { DynamicAppTitleName } from '@/components/header/dynamic-app-title-name';
import { useIsMobileMenuOpen } from '@/hooks/use-mobile-menu-navigation';
import { cn } from '@/utils/tailwindcss-override';
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

/**
 * The title of the header: in the app on the left, next to the menu, with the page's buttons on
 * the right; on the website centred, unless a page brings buttons.
 */
export const AppHeaderTitle: React.FC<{ inAppDesign: boolean }> = ({ inAppDesign }) => {
  const actions = useContext(HeaderActionsContext);
  const mobileMenuOpen = useIsMobileMenuOpen();

  if (actions === undefined && !inAppDesign) {
    return (
      <span className="absolute top-[16px] left-0 flex w-full items-center justify-center font-['Montserrat'] text-[24px] leading-normal font-extrabold xl:hidden">
        <DynamicAppTitleName />
      </span>
    );
  }

  // one row, so a long title ends where the page's buttons begin instead of running under them
  return (
    <div className="pointer-events-none absolute top-0 right-2 left-[60px] z-[105] flex h-[60px] items-center gap-2">
      <span className="min-w-0 flex-1 truncate font-['Montserrat'] text-[22px] leading-none font-extrabold xl:hidden">
        <DynamicAppTitleName />
      </span>
      {/* The open menu makes everything outside its dialog inert, the header included, which
          stays in sight above it: the buttons would show but do nothing. Hidden, not unmounted,
          so a page's button keeps its state. */}
      <div
        className={cn(
          'pointer-events-auto ml-auto flex shrink-0 items-center',
          mobileMenuOpen && 'hidden',
        )}
      >
        {actions}
      </div>
    </div>
  );
};
