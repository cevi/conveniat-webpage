'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import React from 'react';

const ScheduleEntriesProvider = dynamic(
  () =>
    import('@/context/schedule-entries-context').then((module_) => module_.ScheduleEntriesProvider),
  { ssr: false },
);

const StarProvider = dynamic(
  () => import('@/context/star-context').then((module_) => module_.StarProvider),
  { ssr: false },
);

interface ClientProvidersProperties {
  children: ReactNode;
}

export const ClientProviders: React.FC<ClientProvidersProperties> = ({ children }) => {
  return (
    <StarProvider>
      <ScheduleEntriesProvider>{children}</ScheduleEntriesProvider>
    </StarProvider>
  );
};
