'use client';

import React from 'react';
import type {
  ErrorBoundaryPropsWithComponent,
  ErrorBoundaryPropsWithFallback,
} from 'react-error-boundary';
import { ErrorBoundary } from 'react-error-boundary';

type SafeErrorBoundaryProperties =
  | Omit<ErrorBoundaryPropsWithFallback, 'onError'>
  | Omit<ErrorBoundaryPropsWithComponent, 'onError'>;

const handleError = (error: Error, info: React.ErrorInfo): void => {
  console.error('Caught error in ErrorBoundary:', error, info);
};

/**
 * A wrapper around react-error-boundary that automatically logs errors to the console.
 * This can be safely used in Server Components because it doesn't require passing
 * an onError function prop from the server.
 */
export const SafeErrorBoundary: React.FC<
  SafeErrorBoundaryProperties & { children: React.ReactNode }
> = (props) => {
  return <ErrorBoundary {...props} onError={handleError} />;
};
