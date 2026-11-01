'use client';

import { useEffect } from 'react';

/**
 * Events the native apps (app-core `systemBrowserLogin`) dispatch on `window` when they run the
 * Cevi.DB login in the system browser instead of loading it in the WebView.
 */
const OPENED_EVENT = 'native-app-login-opened';
const CANCELLED_EVENT = 'native-app-login-cancelled';

/**
 * Follows a login the native app moved to the system browser: the page itself never navigates, so
 * it learns that the login opened, and that the user closed it without logging in.
 */
export const useNativeAppLoginEvents = ({
  onOpened,
  onCancelled,
}: {
  onOpened: () => void;
  onCancelled: () => void;
}): void => {
  useEffect(() => {
    globalThis.addEventListener(OPENED_EVENT, onOpened);
    globalThis.addEventListener(CANCELLED_EVENT, onCancelled);
    return (): void => {
      globalThis.removeEventListener(OPENED_EVENT, onOpened);
      globalThis.removeEventListener(CANCELLED_EVENT, onCancelled);
    };
  }, [onOpened, onCancelled]);
};
