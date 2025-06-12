'use client';

import {
  QueryClient,
  QueryClientProvider as TanstackQueryClientProvider,
} from '@tanstack/react-query';
import type React from 'react';

const queryClient = new QueryClient();

export const QueryClientProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return <TanstackQueryClientProvider client={queryClient}>{children}</TanstackQueryClientProvider>;
};
