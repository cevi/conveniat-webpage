'use client';

import { AppErrorFallback } from '@/components/error-boundary/app-error-fallback';
import { SafeErrorBoundary } from '@/components/error-boundary/safe-error-boundary';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import type React from 'react';

/**
 * Error boundary around the client rendered dashboard content.
 *
 * The dashboard queries only throw when they failed without any cached data to
 * fall back on (see `throwOnError`), so reaching this fallback means there is
 * genuinely nothing to display. `QueryErrorResetBoundary` clears the query
 * error state when the user retries, otherwise the retry would immediately run
 * into the very same error again.
 */
export const DashboardContentErrorBoundary: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <SafeErrorBoundary onReset={reset} FallbackComponent={AppErrorFallback}>
          {children}
        </SafeErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};
