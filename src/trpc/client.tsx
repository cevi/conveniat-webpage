'use client';

import { environmentVariables } from '@/config/environment-variables';
import { makeQueryClient } from '@/trpc/query-client';
import type { AppRouter } from '@/trpc/routers/_app';
import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import React, { useState } from 'react';
import superjson from 'superjson';

export const trpc = createTRPCReact<AppRouter>();
let clientQueryClientSingleton: QueryClient | undefined;

const getQueryClient = (): QueryClient => {
  if (typeof globalThis === 'undefined') {
    return makeQueryClient();
  }
  return (clientQueryClientSingleton ??= makeQueryClient());
};

const getUrl = (): string => {
  const base = ((): string => {
    if (typeof globalThis !== 'undefined') return '';
    if (environmentVariables.NEXT_PUBLIC_APP_HOST_URL !== '')
      return environmentVariables.NEXT_PUBLIC_APP_HOST_URL;
    return 'http://localhost:3000';
  })();
  return `${base}/api/trpc`;
};

export const TRPCProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const queryClient = getQueryClient();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: getUrl(),
          transformer: superjson,
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
};
