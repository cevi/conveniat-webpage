'use client';

import { useEffect } from 'react';

/**
 * Events the native apps (app-core `systemBrowserLogin`) dispatch on `window` when they run the
 * Cevi.DB login in the system browser instead of loading it in the WebView.
 */
const OPENED_EVENT = 'native-app-login-opened';
const CANCELLED_EVENT = 'native-app-login-cancelled';

/**
 * How long the page waits, once it is shown again, for the app to report the closed login or to
 * load the login's callback in its place. Longer than the app waits before reporting a cancel.
 */
const RETURN_GRACE_MS = 5000;

/**
 * Follows a login the native app moved to the system browser: the page itself never navigates, so
 * it learns that the login opened, and that the user closed it without logging in.
 *
 * The app reports a closed login only while it still counts it as pending, five minutes, and not
 * at all when it was restarted in between. So the page being shown again ends the wait as well: a
 * login that succeeded replaces this page with its callback before the grace runs out.
 */
export const useNativeAppLoginEvents = ({
  onOpened,
  onCancelled,
}: {
  onOpened: () => void;
  onCancelled: () => void;
}): void => {
  useEffect(() => {
    let isLoginOpen = false;
    let returnTimer: ReturnType<typeof setTimeout> | undefined;

    const clearReturnTimer = (): void => {
      if (returnTimer !== undefined) clearTimeout(returnTimer);
      returnTimer = undefined;
    };

    const handleOpened = (): void => {
      isLoginOpen = true;
      onOpened();
    };

    const handleCancelled = (): void => {
      isLoginOpen = false;
      clearReturnTimer();
      onCancelled();
    };

    const handleVisibilityChange = (): void => {
      clearReturnTimer();
      if (isLoginOpen && document.visibilityState === 'visible') {
        returnTimer = setTimeout(handleCancelled, RETURN_GRACE_MS);
      }
    };

    globalThis.addEventListener(OPENED_EVENT, handleOpened);
    globalThis.addEventListener(CANCELLED_EVENT, handleCancelled);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return (): void => {
      clearReturnTimer();
      globalThis.removeEventListener(OPENED_EVENT, handleOpened);
      globalThis.removeEventListener(CANCELLED_EVENT, handleCancelled);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onOpened, onCancelled]);
};
