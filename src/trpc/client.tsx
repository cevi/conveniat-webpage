'use client';

import { environmentVariables } from '@/config/environment-variables';
import { makeQueryClient } from '@/trpc/query-client';
import type { AppRouter } from '@/trpc/routers/_app';
import { getAppModeEntrypointUrl } from '@/utils/standalone-check';
import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import type { Persister } from '@tanstack/react-query-persist-client';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { signOut } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import superjson from 'superjson';

/**
 * Custom fetch function that handles 401 Unauthorized responses.
 * When a 401 is received, it clears auth cookies via signOut and redirects to /entrypoint.
 */
const fetchWithAuthRedirect: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);

  if (response.status === 401) {
    await signOut({ redirect: false });
    globalThis.location.href = getAppModeEntrypointUrl();
    // Return the response anyway to prevent further processing
    return response;
  }

  return response;
};

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

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: getUrl(),
          transformer: superjson,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          fetch: fetchWithAuthRedirect as any,
        }),
      ],
    }),
  );

  const [persister, setPersister] = useState<Persister | undefined>();

  useEffect(() => {
    if (typeof globalThis !== 'undefined') {
      void import('@tanstack/query-async-storage-persister')
        .then(({ createAsyncStoragePersister }) => {
          setPersister(
            createAsyncStoragePersister({
              storage: globalThis.localStorage,
              key: 'conveniat-query-cache',
            }),
          );
        })
        .catch(() => {});
    }
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      {persister ? (
        <PersistQueryClientProvider
          key="persisted-query-client"
          client={queryClient}
          persistOptions={{ persister }}
        >
          {children}
        </PersistQueryClientProvider>
      ) : (
        <QueryClientProvider key="standard-query-client" client={queryClient}>
          {children}
        </QueryClientProvider>
      )}
    </trpc.Provider>
  );
};
