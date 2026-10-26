'use client';

import { rewindHistoryAfterLogin } from '@/utils/login-history';
import type React from 'react';
import { useEffect } from 'react';

/**
 * Runs {@link rewindHistoryAfterLogin} on load and when the page comes back from the back/forward
 * cache, where effects do not run again. The traversal back to the page that started the login
 * usually restores it from there.
 */
const useLoginHistoryRewind = (): void => {
  useEffect(() => {
    rewindHistoryAfterLogin();

    const onPageShow = (event: PageTransitionEvent): void => {
      if (event.persisted) rewindHistoryAfterLogin();
    };
    globalThis.addEventListener('pageshow', onPageShow);
    return (): void => globalThis.removeEventListener('pageshow', onPageShow);
  }, []);
};

/** Keeps the Cevi.DB sign-in pages out of the back stack after a login. Renders nothing. */
export const LoginHistoryRewind: React.FC = () => {
  useLoginHistoryRewind();
  return <></>;
};
