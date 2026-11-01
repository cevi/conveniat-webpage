'use client';

import { useSyncExternalStore } from 'react';

/** Tailwind's `xl` breakpoint, where the app puts its panes side by side. */
const DESKTOP_QUERY = '(min-width: 1280px)';

const subscribe = (onChange: () => void): (() => void) => {
  const query = globalThis.matchMedia(DESKTOP_QUERY);
  query.addEventListener('change', onChange);
  return (): void => query.removeEventListener('change', onChange);
};

/**
 * Whether the screen is as wide as Tailwind's `xl`. For a control that must exist only once but
 * sits in a different place on a desktop; anything else hides and shows with `xl:` classes. False
 * on the server and in the first render, so the phone layout is what is prerendered.
 */
export const useIsDesktop = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => globalThis.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
