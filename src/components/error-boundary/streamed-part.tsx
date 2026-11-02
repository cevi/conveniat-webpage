'use client';

import { SafeErrorBoundary } from '@/components/error-boundary/safe-error-boundary';
import React from 'react';

/**
 * A part of the layout that streams in after the prerendered shell, mostly because it reads the
 * session. When the connection drops before its rows arrive, which on camp wifi is common, React
 * fails it with "Connection closed" (#412). Without a boundary of its own that error reaches
 * `(frontend)/error.tsx`, which replaces the whole layout, header and page included. Here the
 * part keeps showing what the shell showed in its place.
 */
export const StreamedPart: React.FC<{ fallback: React.ReactNode; children: React.ReactNode }> = ({
  fallback,
  children,
}) => (
  <SafeErrorBoundary fallback={fallback}>
    <React.Suspense fallback={fallback}>{children}</React.Suspense>
  </SafeErrorBoundary>
);
