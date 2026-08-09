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
import * as TRPCReactModule from '@trpc/react-query';
import { createTRPCReact } from '@trpc/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { signOut } from 'next-auth/react';
import React, { useState } from 'react';
import superjson from 'superjson';

/** `/entrypoint` is excluded from the i18n rewrites, so it never carries a locale prefix. */
const ENTRYPOINT_PATH = '/entrypoint';

/**
 * Guards against running the sign out more than once: a batched request can
 * produce several concurrent 401s, and `/entrypoint` itself talks to tRPC while
 * syncing offline content - without this, an unauthenticated call from there
 * would reload the page in a loop.
 */
let isHandlingUnauthenticated = false;

/**
 * Custom fetch function that handles 401 Unauthorized responses.
 * When a 401 is received, it clears auth cookies via signOut and redirects to /entrypoint.
 */
const fetchWithAuthRedirect: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);

  if (response.status === 401 && !isHandlingUnauthenticated) {
    isHandlingUnauthenticated = true;
    flushPersonalData();
    try {
      await signOut({ redirect: false });
    } catch (error) {
      console.error('[TRPC] Sign out failed during 401 handling:', error);
    } finally {
      if (globalThis.location.pathname === ENTRYPOINT_PATH) {
        // already there - allow a later 401 to retry the cleanup
        isHandlingUnauthenticated = false;
      } else {
        globalThis.location.href = ENTRYPOINT_PATH;
      }
    }
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
/* eslint-disable unicorn/prevent-abbreviations, unicorn/prefer-add-event-listener, unicorn/no-null */
const indexedDBStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof globalThis === 'undefined' || !('indexedDB' in globalThis)) return null;
    return new Promise((resolve) => {
      try {
        const openRequest = globalThis.indexedDB.open('conveniat-db', 1);
        openRequest.onupgradeneeded = (): void => {
          if (!openRequest.result.objectStoreNames.contains('keyval')) {
            openRequest.result.createObjectStore('keyval');
          }
        };
        openRequest.onsuccess = (): void => {
          const db = openRequest.result;
          const tx = db.transaction('keyval', 'readonly');
          const store = tx.objectStore('keyval');
          const getReq = store.get(key);
          getReq.onsuccess = (): void => {
            resolve((getReq.result as string | undefined) ?? null);
            db.close();
          };
          getReq.onerror = (): void => {
            resolve(null);
            db.close();
          };
        };
        openRequest.onerror = (): void => resolve(null);
      } catch {
        resolve(null);
      }
    });
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof globalThis === 'undefined' || !('indexedDB' in globalThis)) return;
    return new Promise((resolve) => {
      try {
        const openRequest = globalThis.indexedDB.open('conveniat-db', 1);
        openRequest.onupgradeneeded = (): void => {
          if (!openRequest.result.objectStoreNames.contains('keyval')) {
            openRequest.result.createObjectStore('keyval');
          }
        };
        openRequest.onsuccess = (): void => {
          const db = openRequest.result;
          const tx = db.transaction('keyval', 'readwrite');
          const store = tx.objectStore('keyval');
          store.put(value, key);
          tx.oncomplete = (): void => {
            resolve();
            db.close();
          };
          tx.onerror = (): void => {
            console.warn('[IndexedDBStorage] Failed to write to store:', tx.error);
            db.close();
            resolve();
          };
        };
        openRequest.onerror = (): void => resolve();
      } catch {
        resolve();
      }
    });
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof globalThis === 'undefined' || !('indexedDB' in globalThis)) return;
    return new Promise((resolve) => {
      try {
        const openRequest = globalThis.indexedDB.open('conveniat-db', 1);
        openRequest.onupgradeneeded = (): void => {
          if (!openRequest.result.objectStoreNames.contains('keyval')) {
            openRequest.result.createObjectStore('keyval');
          }
        };
        openRequest.onsuccess = (): void => {
          const db = openRequest.result;
          const tx = db.transaction('keyval', 'readwrite');
          const store = tx.objectStore('keyval');
          store.delete(key);
          tx.oncomplete = (): void => {
            resolve();
            db.close();
          };
          tx.onerror = (): void => {
            resolve();
            db.close();
          };
        };
        openRequest.onerror = (): void => resolve();
      } catch {
        resolve();
      }
    });
  },
};
/* eslint-enable unicorn/prevent-abbreviations, unicorn/prefer-add-event-listener, unicorn/no-null */

const persister: Persister =
  // eslint-disable-next-line unicorn/prefer-global-this
  typeof window === 'undefined'
    ? {
        persistClient: (): Promise<void> => Promise.resolve(),
        restoreClient: (): Promise<undefined> => Promise.resolve() as Promise<undefined>,
        removeClient: (): Promise<void> => Promise.resolve(),
      }
    : createAsyncStoragePersister({
        storage: indexedDBStorage,
        serialize: (data) => superjson.stringify(data),
        deserialize: (data) => {
          try {
            return superjson.parse(data);
          } catch (error) {
            console.error('[TRPCPersister] Failed to parse query cache:', error);
            return {
              timestamp: Date.now(),
              buster: '',
              clientState: { queries: [], mutations: [] },
            };
          }
        },
        key: 'conveniat-query-cache-idb',
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
      return (
        defaultShouldDehydrateQuery(query) ||
        query.state.fetchStatus === 'paused' ||
        query.state.data !== undefined
      );
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
const RealTRPCContext = (TRPCReactModule as any).TRPCContext as React.Context<unknown> | undefined;
const fallbackContext = React.createContext<unknown>(undefined);

export function useOptionalTrpcUtils(): ReturnType<typeof trpc.useUtils> | undefined {
  const context = React.useContext(RealTRPCContext ?? fallbackContext);
  if (context === undefined || context === null) {
    return undefined;
  }
  return trpc.useUtils();
}
