import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query';

/** How often a screen showing the programme or the camp map asks for edits, see below. */
export const CAMP_CONTENT_REFRESH_INTERVAL = 2 * 60 * 1000;

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

  // An edit to the programme or the map has to reach every open app within five minutes. Nothing
  // pushes those edits, so a screen showing them asks again every two minutes while it is in
  // front: a request that meets the stale server entry the edit left behind refreshes it, and
  // the next one brings the edit. The server answers an unchanged copy with a bodiless 304, see
  // `src/app/(frontend)/api/trpc`. A resumed app asks at once.
  for (const queryKey of [
    [['schedule', 'getScheduleEntries']],
    [['schedule', 'getById']],
    [['map', 'getMapAnnotations']],
  ]) {
    queryClient.setQueryDefaults(queryKey, {
      staleTime: CAMP_CONTENT_REFRESH_INTERVAL,
      refetchInterval: CAMP_CONTENT_REFRESH_INTERVAL,
      refetchOnWindowFocus: true,
    });
  }

  return queryClient;
};
