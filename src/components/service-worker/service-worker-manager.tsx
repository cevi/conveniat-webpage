'use client';

import { environmentVariables } from '@/config/environment-variables';
import { useAppMode } from '@/hooks/use-app-mode';
import { SerwistProvider } from '@/lib/serwist-client';
import type { ReactNode } from 'react';
import React from 'react';

interface ServiceWorkerManagerProperties {
  children: ReactNode;
  swUrl?: string;
}

/**
 * A central component to manage Service Worker registration and App Mode detection.
 * This ensures that the SW is registered consistently across different layouts.
 */
export const ServiceWorkerManager: React.FC<ServiceWorkerManagerProperties> = ({
  children,
  swUrl = '/serwist/sw.js',
}) => {
  useAppMode();

  if (environmentVariables.NEXT_PUBLIC_DISABLE_SERWIST) {
    return <>{children}</>;
  }

  return <SerwistProvider swUrl={swUrl}>{children}</SerwistProvider>;
};
