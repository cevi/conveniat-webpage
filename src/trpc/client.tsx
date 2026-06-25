'use client';

import { environmentVariables } from '@/config/environment-variables';
import { flushPersonalData } from '@/lib/flush-personal-data';
import { makeQueryClient } from '@/trpc/query-client';
import type { AppRouter } from '@/trpc/routers/_app';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { defaultShouldDehydrateQuery } from '@tanstack/react-query';
import type { Persister } from '@tanstack/react-query-persist-client';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { signOut } from 'next-auth/react';
import React, { useState } from 'react';
import superjson from 'superjson';

/**
 * Custom fetch function that handles 401 Unauthorized responses.
 * When a 401 is received, it clears auth cookies via signOut and redirects to /entrypoint.
 */
const fetchWithAuthRedirect: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);

  if (response.status === 401) {
    flushPersonalData();
    await signOut({ redirect: false });
    globalThis.location.href = '/entrypoint';
    // Return the response anyway to prevent further processing
    return response;
  }

  return response;
};

export const trpc = createTRPCReact<AppRouter>();

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

const getUrl = (): string => {
  const base = ((): string => {
    if (typeof globalThis !== 'undefined') return '';
    if (environmentVariables.NEXT_PUBLIC_APP_HOST_URL !== '')
      return environmentVariables.NEXT_PUBLIC_APP_HOST_URL;
    return 'http://localhost:3000';
  })();
  return `${base}/api/trpc`;
};

const createHttpBatchLink = (): ReturnType<typeof httpBatchLink> => {
  return httpBatchLink({
    url: getUrl(),
    transformer: superjson,
    fetch: fetchWithAuthRedirect as unknown as NonNullable<
      Parameters<typeof httpBatchLink>[0]['fetch']
    >,
  });
};

/**
 * Setup static persister which falls back to no-op on Server Side Rendering.
 * This guarantees consistent component mounting during hydration and prevents warnings.
 */
const persister: Persister =
  // eslint-disable-next-line unicorn/prefer-global-this
  typeof window === 'undefined'
    ? {
        persistClient: (): Promise<void> => Promise.resolve(),
        restoreClient: (): Promise<undefined> => Promise.resolve(undefined),
        removeClient: (): Promise<void> => Promise.resolve(),
      }
    : createAsyncStoragePersister({
        storage: globalThis.localStorage,
        key: 'conveniat-query-cache',
      });

const persistOptions = {
  persister,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Parameters<typeof defaultShouldDehydrateQuery>[0]): boolean => {
      if (query.meta?.['persist'] === false) {
        return false;
      }
      if (query.queryKey[0] === 'qrCodeSvgImage') {
        return false;
      }
      return defaultShouldDehydrateQuery(query);
    },
  },
};

export const TRPCProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  // Use React state initializers
  // eslint-disable-next-line react-naming-convention/use-state
  const [queryClient] = useState(() => makeQueryClient());
  // eslint-disable-next-line react-naming-convention/use-state
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [createHttpBatchLink()],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        {children}
      </PersistQueryClientProvider>
    </trpc.Provider>
  );
};
