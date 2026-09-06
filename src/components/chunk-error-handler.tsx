'use client';

import { attemptStaleBundleRecovery } from '@/utils/chunk-error-recovery';
import type React from 'react';
import { useEffect } from 'react';

/**
 * Routes stale-bundle errors that reach `window` into the recovery reload.
 *
 * This covers the errors nothing else catches. Errors thrown during render are caught by a
 * React error boundary instead and never reach `window`, so those boundaries call
 * {@link attemptStaleBundleRecovery} themselves. See `@/utils/chunk-error-recovery` for what
 * counts as a stale bundle and why a reload is the only way out of one.
 */
export const ChunkErrorHandler: React.FC = () => {
  useEffect(() => {
    const handleError = (event: ErrorEvent): void => {
      attemptStaleBundleRecovery(event.error, event.message);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
      const reason = event.reason as unknown;
      attemptStaleBundleRecovery(reason, String(reason));
    };

    globalThis.addEventListener('error', handleError);
    globalThis.addEventListener('unhandledrejection', handleUnhandledRejection);

    return (): void => {
      globalThis.removeEventListener('error', handleError);
      globalThis.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null; // eslint-disable-line unicorn/no-null
};
