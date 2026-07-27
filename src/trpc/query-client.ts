import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query';

export const makeQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 24 * 60 * 60 * 1000, // 24 hours for offline disk persistence
        networkMode: 'offlineFirst',
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        networkMode: 'offlineFirst',
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
      },
      hydrate: {},
    },
  });
};
