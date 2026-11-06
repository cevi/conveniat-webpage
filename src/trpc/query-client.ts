import type {
  DefaultedQueryObserverOptions,
  DefaultError,
  QueryKey,
  QueryObserverOptions,
} from '@tanstack/react-query';
import {
  defaultShouldDehydrateQuery,
  environmentManager,
  QueryClient,
} from '@tanstack/react-query';

/** How often a screen showing the programme or the camp map asks for edits, see below. */
export const CAMP_CONTENT_REFRESH_INTERVAL = 2 * 60 * 1000;

/**
 * The query client of one server render, which never schedules the removal of a query.
 *
 * A finite `gcTime` makes every query start a timer when nothing observes it any more, which on
 * the server is right after the render. The timer keeps the async context it was started in, and
 * that context holds the whole request: the response, its RSC payload and the render's buffers. With
 * the 72 hours the browser needs for offline persistence, every rendered page stayed in memory
 * for longer than a replica lives, until the heap ran out (#1659). TanStack defaults `gcTime` to
 * `Infinity` on the server for this reason, and the client is dropped with the request anyway.
 * It is set here rather than in the defaults because a query's own `gcTime`, like the seven days
 * of the chat queries, overrides those.
 */
class ServerQueryClient extends QueryClient {
  override defaultQueryOptions<
    TQueryFunctionData = unknown,
    TError = DefaultError,
    TData = TQueryFunctionData,
    TQueryData = TQueryFunctionData,
    TQueryKey extends QueryKey = QueryKey,
    TPageParameter = never,
  >(
    options:
      | QueryObserverOptions<
          TQueryFunctionData,
          TError,
          TData,
          TQueryData,
          TQueryKey,
          TPageParameter
        >
      | DefaultedQueryObserverOptions<TQueryFunctionData, TError, TData, TQueryData, TQueryKey>,
  ): DefaultedQueryObserverOptions<TQueryFunctionData, TError, TData, TQueryData, TQueryKey> {
    return { ...super.defaultQueryOptions(options), gcTime: Infinity };
  }
}

export const makeQueryClient = (): QueryClient => {
  const queryClient = new (environmentManager.isServer() ? ServerQueryClient : QueryClient)({
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
