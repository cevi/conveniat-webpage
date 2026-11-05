'use client';

import { useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void): (() => void) => {
  document.addEventListener('visibilitychange', onChange);
  return (): void => document.removeEventListener('visibilitychange', onChange);
};

const isVisible = (): boolean => document.visibilityState === 'visible';

/** The server renders the page as if it were seen. */
const visibleOnServer = (): boolean => true;

/** Whether the page is on the screen, false while the app is in the background. */
export const usePageVisible = (): boolean =>
  useSyncExternalStore(subscribe, isVisible, visibleOnServer);
