import type { CacheEntry } from '@/cache-handlers/types';
import { defineCounter, defineHistogram } from '@/lib/telemetry/metrics';
import { trace } from '@opentelemetry/api';

/**
 * What a `'use cache'` lookup found, judged by the rule Next.js applies to the entry we return
 * (`use-cache-wrapper.js`, Next.js 16.4):
 *
 * - `hit`: fresh, served as is.
 * - `stale`: past `revalidate`. Next.js serves it and refreshes it in the background, inside
 *   the request that asked, which is why that request's span runs on after its response.
 * - `miss`: nothing usable, so the caller renders and waits. Covers an absent key, an entry
 *   past `expire` and one refused because its tags were flushed after its render.
 * - `error`: Redis failed or timed out. Served as a miss, counted apart so that a Redis outage
 *   does not read as a cold cache.
 *
 * A prerender treats a stale entry as a miss; the handler cannot tell, so it counts `stale`.
 */
export type CacheLookupResult = 'hit' | 'stale' | 'miss' | 'error';

const SCOPE = 'nextjs-redis-cache';

const lookups = defineCounter<{ result: CacheLookupResult }>({
  scope: SCOPE,
  name: 'cache_lookups_total',
  description: "Lookups of 'use cache' entries, by what they found",
});

const lookupDuration = defineHistogram<{ result: CacheLookupResult }>({
  scope: SCOPE,
  name: 'cache_lookup_duration_seconds',
  description: "Time to look up a 'use cache' entry, including the tag flush check",
  // A Redis round trip takes about a millisecond; commands give up after one second.
  buckets: [0.0005, 0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
});

const entrySize = defineHistogram({
  scope: SCOPE,
  name: 'cache_entry_size_bytes',
  description: "Size of the 'use cache' entries written, without their metadata",
  // From a single flag to a whole programme with its map annotations.
  buckets: [1024, 4096, 16_384, 65_536, 262_144, 1_048_576, 4_194_304, 16_777_216],
});

/**
 * The current time in milliseconds. `Date.now()` inside a prerender counts as IO under
 * `cacheComponents` and aborts it, while `performance` is left alone for measuring, which is
 * what Next.js itself reads here.
 */
export const now = (): number => performance.timeOrigin + performance.now();

/**
 * Judges an entry the way Next.js will.
 *
 * @param entry The entry the handler is about to return, if any.
 * @param at The current time in milliseconds.
 * @returns What the lookup found, never `error`.
 */
export const classifyLookup = (entry: CacheEntry | undefined, at: number): CacheLookupResult => {
  if (entry === undefined) return 'miss';
  if (at > entry.timestamp + entry.expire * 1000) return 'miss';
  if (at > entry.timestamp + entry.revalidate * 1000) return 'stale';
  return 'hit';
};

/**
 * Counts a lookup and notes it on the span of the code that asked, a tRPC procedure or a
 * render, so a trace says which of its cached reads were stale.
 *
 * An event and not a span of its own: the SDK reads `Date.now()` when it starts a span, which
 * aborts a prerender, while an event takes its time from `performance`. Most traces are sampled
 * away by the collector, so the hit rate comes from the counter, not from traces.
 *
 * @param result What the lookup found.
 * @param startedAt When the lookup started, from `now()`.
 * @param entry The entry found, if any.
 */
export const recordLookup = (
  result: CacheLookupResult,
  startedAt: number,
  entry?: CacheEntry,
): void => {
  const at = now();
  lookups.add(1, { result });
  lookupDuration.record((at - startedAt) / 1000, { result });

  trace.getActiveSpan()?.addEvent('cache.lookup', {
    'cache.result': result,
    'cache.duration_ms': at - startedAt,
    ...(entry && {
      'cache.age_seconds': Math.round((at - entry.timestamp) / 1000),
      'cache.revalidate_seconds': entry.revalidate,
      // The tags name the cached function far better than its encoded key does.
      'cache.tags': entry.tags,
    }),
  });
};

/**
 * Records the size of an entry written to the cache.
 *
 * @param bytes The size of its body.
 */
export const recordEntrySize = (bytes: number): void => {
  entrySize.record(bytes);
};
