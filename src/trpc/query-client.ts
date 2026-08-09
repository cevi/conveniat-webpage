import {
  isUserBlockedError,
  reloadForBlockedUser,
} from '@/lib/user-blocking/is-user-blocked-error';
import {
  defaultShouldDehydrateQuery,
  MutationCache,
  QueryCache,
  QueryClient,
} from '@tanstack/react-query';

/**
 * If the server rejects a request because the user has been blocked while the app was
 * already open, we reload so that the blocked notice takes over the whole app.
 */
const handleBlockedUserError = (error: unknown): void => {
  if (isUserBlockedError(error)) reloadForBlockedUser();
};

export const makeQueryClient = (): QueryClient => {
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleBlockedUserError }),
    mutationCache: new MutationCache({ onError: handleBlockedUserError }),
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 72 * 60 * 60 * 1000, // 72 hours for offline disk persistence
        networkMode: 'online',
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        networkMode: 'online',
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending' ||
          query.state.data !== undefined,
      },
      hydrate: {},
    },
  });
};
