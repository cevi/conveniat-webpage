import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query';

export const makeQueryClient = (): QueryClient => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 72 * 60 * 60 * 1000, // 72 hours for offline disk persistence
        networkMode: 'online',
        // The cache is persisted for days, so a screen has to revalidate what it restores or it
        // shows the first answer it ever got. This only refetches data older than `staleTime`,
        // and `networkMode: 'online'` holds the request while offline, keeping the cached value.
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        networkMode: 'online',
      },
      dehydrate: {
        shouldDehydrateQuery: (query): boolean =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending' ||
          query.state.data !== undefined,
      },
      hydrate: {},
    },
  });

  // The signed-in user's id cannot change until sign-out, which drops the whole cache. Every
  // chat message reads it, so with the default a message arriving after five minutes would have
  // every client in the chat ask for it at once.
  queryClient.setQueryDefaults([['chat', 'user']], { staleTime: Infinity });

  return queryClient;
};
