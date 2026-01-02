'use client';

import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
type SafeErrorBoundaryProperties = Omit<React.ComponentProps<typeof ErrorBoundary>, 'onError'>;

const SafeErrorBoundary: React.FC<
  SafeErrorBoundaryProperties & { children: React.ReactNode; suppressPostHog?: boolean }
> = ({ suppressPostHog, ...props }) => {
  const handleError = (error: Error, info: React.ErrorInfo): void => {
    if (suppressPostHog) {
      console.warn('Suppressing error in SafeErrorBoundary due to draft mode:', error);
      return;
    }
    console.error('Caught error in ErrorBoundary:', error, info);
  };

  return (
    <ErrorBoundary
      {...(props as React.ComponentProps<typeof ErrorBoundary>)}
      onError={handleError}
    />
  );
};

export { SafeErrorBoundary };
