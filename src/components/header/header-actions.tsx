'use client';

import {
  DEFAULT_APP_TITLE,
  DynamicAppTitleName,
  useDynamicAppTitle,
} from '@/components/header/dynamic-app-title-name';
import { useHideHeader } from '@/components/header/hide-header-context';
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
 * the right; on the website centred, unless a page brings buttons. `inlineOnDesktop` keeps both on
 * a desktop, right of the brand, where the website's menu takes the rest of the header.
 */
export const AppHeaderTitle: React.FC<{ inAppDesign: boolean; inlineOnDesktop?: boolean }> = ({
  inAppDesign,
  inlineOnDesktop = false,
}) => {
  const actions = useContext(HeaderActionsContext);
  const mobileMenuOpen = useIsMobileMenuOpen();
  // A page that hides the header, like the detail of a block, brings its own heading; the
  // header's title is then only the desktop's label, not a second page heading.
  const { hideHeader } = useHideHeader();
  const Title = hideHeader ? 'span' : 'h1';
  // a page of the website has no name of its own here; beside the brand on a desktop that would
  // read "conveniat27 | conveniat27", and the page's own heading names it anyway
  const { dynamicAppTitle } = useDynamicAppTitle();
  const titledOnDesktop = inlineOnDesktop && dynamicAppTitle !== DEFAULT_APP_TITLE;

  if (actions === undefined && !inAppDesign) {
    return (
      <span className="absolute top-[16px] left-0 flex w-full items-center justify-center font-['Montserrat'] text-[24px] leading-normal font-extrabold xl:hidden">
        <DynamicAppTitleName />
      </span>
    );
  }

  // One row, so a long title ends where the page's buttons begin instead of running under them.
  // The app has the menu on the left; the website has its logo there and the menu on the right.
  return (
    <div
      className={cn(
        'pointer-events-none absolute top-0 right-2 left-[60px] z-[105] flex h-[60px] items-center gap-2',
        !inAppDesign && 'right-[56px] left-[112px] xl:right-2',
        inlineOnDesktop && 'xl:pointer-events-auto xl:static xl:ml-4 xl:h-10 xl:shrink-0 xl:gap-1',
        titledOnDesktop && 'xl:border-l xl:border-gray-200 xl:pl-4',
      )}
    >
      {/* the page's heading: the title is what every app page is called */}
      <Title
        className={cn(
          "min-w-0 flex-1 truncate font-['Montserrat'] text-[22px] leading-none font-extrabold xl:hidden",
          titledOnDesktop && 'xl:text-heading xl:block xl:max-w-64 xl:flex-none xl:text-lg',
        )}
      >
        <DynamicAppTitleName />
      </Title>
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
