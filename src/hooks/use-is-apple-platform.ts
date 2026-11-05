'use client';

import { useSyncExternalStore } from 'react';

const unsubscribe = (): void => {};

// the platform never changes while the page is open
const subscribe = (): (() => void) => unsubscribe;

/**
 * Whether the browser runs on a Mac, an iPhone or an iPad, where a shortcut is named with ⌘
 * instead of Ctrl. iPadOS reports itself as a Mac, which is what its keyboard wants anyway.
 * False on the server and in the first render, so the prerendered page names Ctrl.
 */
export const useIsApplePlatform = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => /Mac|iPhone|iPad/.test(globalThis.navigator.userAgent),
    () => false,
  );
