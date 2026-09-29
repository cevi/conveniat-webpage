import type { Query } from '@tanstack/react-query';
import { defaultShouldDehydrateQuery } from '@tanstack/react-query';
import type { PersistedClient } from '@tanstack/react-query-persist-client';
import superjson from 'superjson';

/**
 * Decides which queries go into the IndexedDB blob.
 *
 * Only queries that hold data are worth keeping. A query that is still waiting, for example
 * one paused because the device is offline, has nothing to restore, and TanStack dehydrates a
 * pending query together with its in-flight promise. superjson writes that promise as `{}`, and
 * restoring it throws `promise.then is not a function`, after which the persister deletes the
 * whole blob. Closing the app while a single query waited offline used to cost every cached
 * chat and schedule on the next launch.
 */
export const shouldPersistQuery = (query: Query): boolean => {
  if (query.meta?.['persist'] === false) {
    return false;
  }
  if (query.queryKey[0] === 'qrCodeSvgImage') {
    return false;
  }
  // The offline sync calls schedule.getById.setData() for every entry, which duplicates the
  // whole schedule a second time inside this blob — roughly 500 entries carrying Lexical
  // descriptions. The blob is written and parsed as a single unit, so that duplication is
  // paid again on every persist and on every startup, and until the parse completes no
  // cached value is available and the schedule view loses the race to the network.
  // Nothing is lost offline: the entry list itself is still persisted, the detail views
  // already fall back to finding the entry in that list, and TanStack DB keeps its own copy.
  const trpcPath = Array.isArray(query.queryKey[0]) ? (query.queryKey[0] as string[]) : [];
  if (trpcPath[0] === 'schedule' && trpcPath[1] === 'getById') {
    return false;
  }
  return defaultShouldDehydrateQuery(query) || query.state.data !== undefined;
};

/**
 * How long the IndexedDB blob stays usable after it was last written.
 *
 * TanStack discards an older blob at startup, and its default is 24 hours, shorter than the
 * default `gcTime` of 72 hours and the 7 days the chat queries keep. A phone left unopened for a
 * day, on a hike or switched off overnight, started with an empty cache. This matches the
 * longest `gcTime`, so no query is dropped before its own time runs out.
 */
export const PERSISTED_QUERY_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * The persister writes the cache at most once per this interval: the first change at once, the
 * last one when the interval ends. Whoever needs the stored cache to reflect a change, like
 * clearing it before another user logs in, has to wait this long.
 */
export const PERSISTER_THROTTLE_MS = 1000;

const emptyPersistedClient = (): PersistedClient => ({
  timestamp: Date.now(),
  buster: '',
  clientState: { queries: [], mutations: [] },
});

/**
 * Parses the IndexedDB blob and drops queries that were saved while still pending.
 *
 * Blobs written before {@link shouldPersistQuery} stopped persisting them can still hold such a
 * query, and a single one makes the whole restore throw. Dropping them here keeps the rest of
 * the cache for users who update the app with one of those blobs on their phone.
 */
export const deserializePersistedClient = (data: string): PersistedClient => {
  try {
    const persistedClient = superjson.parse<PersistedClient>(data);
    return {
      ...persistedClient,
      clientState: {
        ...persistedClient.clientState,
        queries: persistedClient.clientState.queries.filter(
          (query) => query.state.status !== 'pending',
        ),
      },
    };
  } catch (error) {
    console.error('[TRPCPersister] Failed to parse query cache:', error);
    return emptyPersistedClient();
  }
};

/** Serialises the blob with superjson so dates and maps survive the round trip. */
export const serializePersistedClient = (data: PersistedClient): string =>
  superjson.stringify(data);
