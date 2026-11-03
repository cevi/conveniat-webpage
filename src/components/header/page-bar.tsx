'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/tailwindcss-override';
import type { ReactNode } from 'react';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const PageBarContext = createContext<ReactNode>(undefined);
const SetPageBarContext = createContext<(bar: ReactNode) => void>(() => {});

/** Holds the bar the current page shows right below the header, such as its breadcrumbs. */
export const PageBarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [bar, setBar] = useState<ReactNode>();
  return (
    <SetPageBarContext.Provider value={setBar}>
      <PageBarContext.Provider value={bar}>{children}</PageBarContext.Provider>
    </SetPageBarContext.Provider>
  );
};

/** The row inside the bar, for its content and its placeholder to be the same height. */
export const PAGE_BAR_ROW_CLASS = 'flex min-h-14 items-center justify-between gap-3 py-1.5';

/**
 * Shows its children in a bar that sticks right below the header while the page is shown. A
 * block deep in a CMS page puts its breadcrumbs there, above the page's title and whatever an
 * editor placed before the block.
 *
 * The bar only exists once the page runs in the browser. A block that will set one marks its
 * prerendered fallback with `data-page-bar-pending`, and the bar's place is held from the first
 * paint, so nothing below moves when it arrives.
 */
export const SetPageBar: React.FC<{ children: ReactNode }> = ({ children }) => {
  const setBar = useContext(SetPageBarContext);
  useEffect(() => {
    setBar(children);
  }, [children, setBar]);
  useEffect(() => (): void => setBar(undefined), [setBar]);
  return <></>;
};

/**
 * Sets the bar's height as `--page-bar-height` on its parent while it is shown, for whatever
 * else sticks below the header, like a table's head, to stick below the bar instead.
 */
const usePublishedBarHeight = (bar: HTMLDivElement | undefined): void => {
  useEffect(() => {
    const parent = bar?.parentElement;
    if (bar === undefined || parent === null || parent === undefined) return;
    const observer = new ResizeObserver(() => {
      parent.style.setProperty('--page-bar-height', `${bar.offsetHeight}px`);
    });
    observer.observe(bar);
    return (): void => {
      observer.disconnect();
      parent.style.removeProperty('--page-bar-height');
    };
  }, [bar]);
};

/**
 * Where the page's bar sits: first in the content, sticking below the header and the offline
 * banner. On a phone the website's round logo hangs out of the header, so there the bar starts
 * under it, also while it sticks; the app's header has none.
 */
export const PageBar: React.FC<{ inAppDesign: boolean }> = ({ inAppDesign }) => {
  const content = useContext(PageBarContext);
  const [bar, setBar] = useState<HTMLDivElement>();
  // stable, or React would detach and attach the ref, and set the state, on every render
  const barReference = useCallback((element: HTMLDivElement | null): void => {
    setBar(element ?? undefined);
  }, []);
  usePublishedBarHeight(bar);

  const frame = cn(
    // the same inset as the page's content below, so the bar lines up with it
    'border-line sticky top-[calc(var(--app-header-height)+var(--offline-banner-height,0px))] z-30 border-b bg-white xl:px-12',
    !inAppDesign && 'pt-8 xl:pt-0',
  );
  const inset = 'mx-auto w-full max-w-[1920px] px-4 md:px-8 xl:px-16';

  if (content === undefined) {
    // CSS, not state: it has to be right in the prerendered HTML, before any script ran
    return (
      <div aria-hidden className={cn(frame, 'hidden in-[main:has([data-page-bar-pending])]:block')}>
        <div className={inset}>
          <div className={PAGE_BAR_ROW_CLASS}>
            <Skeleton className="h-6 w-64 max-w-[60%]" />
            <Skeleton className="h-11 w-11 md:w-56" />
          </div>
        </div>
      </div>
    );
  }
  return (
    // data-page-bar: a page's title keeps no room under the header then, the bar is that room
    <div ref={barReference} data-page-bar className={frame}>
      <div className={inset}>{content}</div>
    </div>
  );
};
