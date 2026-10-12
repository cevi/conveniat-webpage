'use client';

import { ScheduleEntriesProvider } from '@/context/schedule-entries-context';
import { StarProvider } from '@/context/star-context';
import type React from 'react';
import type { ReactNode } from 'react';

interface ClientProvidersProperties {
  children: ReactNode;
}

// Both providers render on the server. Loading them with `ssr: false` made this boundary, which
// holds the whole application, bail out to client-side rendering and ship an empty `<body>`.
export const ClientProviders: React.FC<ClientProvidersProperties> = ({ children }) => {
  return (
    <StarProvider>
      <ScheduleEntriesProvider>{children}</ScheduleEntriesProvider>
    </StarProvider>
  );
};
