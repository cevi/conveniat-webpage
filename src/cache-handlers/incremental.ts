/**
 * The server cache handler (`cacheHandler`, singular): Next.js's own file system cache, which
 * also learns of tag flushes made by the other replica.
 *
 * Page shells (`APP_PAGE` and `APP_ROUTE` entries) stay on each replica's disk and in its memory.
 * Next.js checks them against a tag manifest held in the process, which only a `revalidateTag()`
 * on the same replica updates. So after an editor published the header, the replica that did not
 * handle the publish kept serving the old shell until its own revalidate time ran out (#2645).
 *
 * `revalidateTag()` also reaches the `'use cache'` handler, which records the time of each flush
 * in Redis. Before Next.js checks a shell, this handler copies those times into the local tag
 * manifest, as if the flush had happened here. Next.js then treats the shell exactly as it does
 * after a local `revalidateTag(tag, 'max')`: it serves it once more and renders it again in the
 * background, reading the fresh `'use cache'` entries from Redis.
 */
import { createCacheRedisClient, readFlushedAt } from '@/cache-handlers/handlers/redis';
import { createLogger } from '@/utils/server-logger';
import type Redis from 'ioredis';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { NEXT_CACHE_TAGS_HEADER } from 'next/dist/lib/constants';
import type { CacheHandler, CacheHandlerValue } from 'next/dist/server/lib/incremental-cache';
import FileSystemCacheExport from 'next/dist/server/lib/incremental-cache/file-system-cache';
import { tagsManifest } from 'next/dist/server/lib/incremental-cache/tags-manifest.external';

const logger = createLogger('cache:incremental');

/**
 * `build:cache` bundles this file as an ES module of a `"type": "module"` package, so the default
 * import of Next.js's CommonJS file is its whole `module.exports`, with the class at `default`.
 * Jest compiles it as CommonJS and hands over the class itself.
 */
const FileSystemCache =
  'default' in FileSystemCacheExport
    ? (FileSystemCacheExport as unknown as { default: typeof FileSystemCacheExport }).default
    : FileSystemCacheExport;

const isBuild =
  // eslint-disable-next-line n/no-process-env
  process.env['NEXT_PHASE'] === PHASE_PRODUCTION_BUILD || process.argv.includes('build');

/**
 * The tags Next.js stamped on a cached page or route response, empty for any other entry. Only
 * responses carry `headers`; a fetch keeps its tags elsewhere, and nothing here uses the fetch
 * cache.
 */
const responseTags = (entry: CacheHandlerValue | null): string[] => {
  const value = entry?.value;
  if (value === null || value === undefined || !('headers' in value)) return [];
  const header = value.headers?.[NEXT_CACHE_TAGS_HEADER];
  return typeof header === 'string' && header !== '' ? header.split(',') : [];
};

export default class IncrementalCache extends FileSystemCache {
  // One connection per process: Next.js builds a handler for every request.
  private static redis: Redis | undefined;

  override async get(...args: Parameters<CacheHandler['get']>): Promise<CacheHandlerValue | null> {
    const entry = await super.get(...args);
    const tags = responseTags(entry);
    if (isBuild || tags.length === 0) return entry;

    IncrementalCache.redis ??= createCacheRedisClient();
    try {
      const flushedAt = await readFlushedAt(IncrementalCache.redis, tags);
      for (const [index, tag] of tags.entries()) {
        const flushed = flushedAt[index];
        if (flushed === undefined) continue;
        const local = tagsManifest.get(tag);
        if ((local?.stale ?? 0) >= flushed) continue;
        tagsManifest.set(tag, { ...local, stale: flushed });
      }
    } catch (error) {
      // Serve what this replica has; it is at worst as stale as before #2645.
      logger.warn('Reading tag flushes failed, serving the local entry', { error });
    }
    return entry;
  }
}
