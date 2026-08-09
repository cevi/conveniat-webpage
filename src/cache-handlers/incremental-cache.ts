/*
 * Next's `CacheHandler` API uses `null` (not `undefined`) both as the "cache
 * miss" return value of `get` and as the `set` payload of a not-found route.
 */
/* eslint-disable unicorn/no-null */
/**
 * src/cache-handlers/incremental-cache.ts
 *
 * Redis backed implementation of Next's **singular** `cacheHandler` option,
 * i.e. the route/response cache behind the `x-nextjs-cache` header
 * (`APP_PAGE`, `APP_ROUTE`, `PAGES`, `FETCH`, `IMAGE` entries).
 *
 * Without it Next falls back to its `FileSystemCache`, which is a per-process
 * LRU over the container local `.next/server/app` directory. With more than
 * one replica every replica then renders and caches its own PPR fallback
 * shell, so the same URL can answer with different RSC payloads depending on
 * which replica handled the request.
 *
 * The `'use cache'` handlers (plural `cacheHandlers`, see
 * `src/cache-handlers/orchestrator.ts`) are a different cache and stay
 * untouched; both share the same Redis but use disjoint key spaces.
 *
 * Every Redis failure degrades to a cache miss - this handler never throws
 * into Next.
 */
import {
  buildRouteCacheKey,
  buildTagKey,
  deserializeCacheEntry,
  extractCacheTags,
  serializeCacheEntry,
  type RouteCacheScope,
} from '@/cache-handlers/incremental-cache-serialization';
import Redis from 'ioredis';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import type {
  CacheHandlerContext,
  CacheHandlerValue,
} from 'next/dist/server/lib/incremental-cache';
import type {
  CachedRouteKind,
  GetIncrementalFetchCacheContext,
  GetIncrementalResponseCacheContext,
  IncrementalCacheKind,
  IncrementalCacheValue,
  SetIncrementalFetchCacheContext,
  SetIncrementalResponseCacheContext,
} from 'next/dist/server/response-cache';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const LOG_PREFIX = '[RedisIncrementalCache]';

// eslint-disable-next-line n/no-process-env
const REDIS_URL_FROM_ENV = process.env['REDIS_URL'];

/** Same connection target as `handlers/redis.ts`. */
const REDIS_URL =
  REDIS_URL_FROM_ENV === undefined || REDIS_URL_FROM_ENV === ''
    ? 'redis://localhost:6379'
    : REDIS_URL_FROM_ENV;

const isBuild =
  // eslint-disable-next-line n/no-process-env
  process.env['NEXT_PHASE'] === PHASE_PRODUCTION_BUILD || process.argv.includes('build');

/**
 * Ambient `const enum` members of Next cannot be imported as values while
 * `isolatedModules` is enabled, so we mirror the two we need.
 */
const REQUEST_KIND_FETCH = 'FETCH' as IncrementalCacheKind.FETCH;
const VALUE_KIND_FETCH = 'FETCH' as CachedRouteKind.FETCH;

/** One year - Redis TTLs are only a garbage collection backstop here. */
const DEFAULT_TTL_SECONDS = 31_536_000;

/** Never let a short `expire` turn the shared cache into a thrashing cache. */
const MINIMUM_TTL_SECONDS = 60;

declare global {
  var redisIncrementalCacheClient: Redis | undefined;
  var redisIncrementalCacheBuildId: string | undefined;
}

/**
 * Next creates a new cache handler instance for every request, so the Redis
 * connection has to live in module (respectively global) scope.
 */
const getRedisClient = (): Redis | undefined => {
  if (isBuild) return undefined;
  if (globalThis.redisIncrementalCacheClient) return globalThis.redisIncrementalCacheClient;

  try {
    const client = new Redis(REDIS_URL, {
      lazyConnect: true,
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
      retryStrategy: (times: number): number | void | null => Math.min(times * 50, 2000),
    });

    client.on('error', (error: { code: string }) => {
      if (error.code !== 'EAI_AGAIN') {
        console.error(`${LOG_PREFIX} Connection Error`, error);
      }
    });

    globalThis.redisIncrementalCacheClient = client;
    console.log(`${LOG_PREFIX} Initialized (PID: ${process.pid})`);

    return client;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to initialize Redis client`, error);
    return undefined;
  }
};

/**
 * Resolves the current build id, which namespaces all keys so that entries of
 * a previous deploy are never served by a newer one.
 */
const resolveBuildId = (serverDirectory: string | undefined): string => {
  if (globalThis.redisIncrementalCacheBuildId !== undefined) {
    return globalThis.redisIncrementalCacheBuildId;
  }

  // eslint-disable-next-line n/no-process-env
  const deploymentId = process.env['NEXT_DEPLOYMENT_ID'];
  let buildId = deploymentId === undefined || deploymentId === '' ? undefined : deploymentId;

  if (buildId === undefined && serverDirectory !== undefined) {
    try {
      buildId = readFileSync(path.join(serverDirectory, '..', 'BUILD_ID'), 'utf8').trim();
    } catch {
      // no BUILD_ID available (e.g. during `next build`), fall through
    }
  }

  buildId = buildId === undefined || buildId === '' ? 'unknown' : buildId;
  globalThis.redisIncrementalCacheBuildId = buildId;

  return buildId;
};

/**
 * TTL of an entry. We intentionally do not use `revalidate` as TTL: Next
 * decides on its own when an entry is stale and relies on being able to read
 * (and then revalidate) a stale entry.
 */
const resolveTtlSeconds = (
  ctx: SetIncrementalFetchCacheContext | SetIncrementalResponseCacheContext,
): number => {
  if (ctx.fetchCache === true) return DEFAULT_TTL_SECONDS;

  const expire = ctx.cacheControl?.expire;
  if (typeof expire === 'number' && Number.isFinite(expire) && expire > 0) {
    return Math.max(Math.ceil(expire), MINIMUM_TTL_SECONDS);
  }

  return DEFAULT_TTL_SECONDS;
};

export class RedisIncrementalCache {
  private readonly redis: Redis | undefined;
  private readonly buildId: string;
  private readonly revalidatedTags: Set<string>;

  constructor(ctx: CacheHandlerContext) {
    this.redis = getRedisClient();
    this.buildId = resolveBuildId(ctx.serverDistDir);
    this.revalidatedTags = new Set(ctx.revalidatedTags);
  }

  /**
   * Reads an entry from the shared cache. Returns `null` on a miss, on
   * malformed data and on any Redis error.
   */
  async get(
    cacheKey: string,
    ctx: GetIncrementalFetchCacheContext | GetIncrementalResponseCacheContext,
  ): Promise<CacheHandlerValue | null> {
    const redis = this.redis;
    if (!redis) return null;

    const isFetchRequest = ctx.kind === REQUEST_KIND_FETCH;
    const key = buildRouteCacheKey(this.buildId, isFetchRequest ? 'fetch' : 'route', cacheKey);

    try {
      const raw = await redis.get(key);
      if (raw === null) return null;

      const entry = deserializeCacheEntry(raw);
      if (entry === undefined) {
        console.warn(`${LOG_PREFIX} DROPPING malformed entry: ${key}`);
        return null;
      }

      // Guard against ever handing Next a value of the wrong kind (it would
      // throw an InvariantError).
      const isFetchValue = entry.value.kind === VALUE_KIND_FETCH;
      if (isFetchValue !== isFetchRequest) return null;

      // A tag revalidated within this request must not be served from cache.
      if (ctx.kind === REQUEST_KIND_FETCH) {
        const tags = [...(ctx.tags ?? []), ...(ctx.softTags ?? [])];
        if (tags.some((tag) => this.revalidatedTags.has(tag))) return null;
      }

      return { lastModified: entry.lastModified, value: entry.value };
    } catch (error) {
      console.warn(`${LOG_PREFIX} GET FAILED: ${key}`, (error as Error).message);
      return null;
    }
  }

  /**
   * Writes an entry to the shared cache and registers it in the tag sets.
   * Redis errors are swallowed - a failed write only costs a re-render.
   */
  async set(
    cacheKey: string,
    data: IncrementalCacheValue | null,
    ctx: SetIncrementalFetchCacheContext | SetIncrementalResponseCacheContext,
  ): Promise<void> {
    const redis = this.redis;
    // `null` marks a not-found route; like Next's FileSystemCache we do not
    // persist those.
    if (!redis || data === null) return;

    const isFetchRequest = ctx.fetchCache === true;
    const scope: RouteCacheScope = isFetchRequest ? 'fetch' : 'route';
    const key = buildRouteCacheKey(this.buildId, scope, cacheKey);

    try {
      const payload = serializeCacheEntry(data, Date.now());
      if (payload === undefined) {
        console.warn(`${LOG_PREFIX} SKIPPED unserializable entry: ${key}`);
        return;
      }

      const ttl = resolveTtlSeconds(ctx);
      const tags = extractCacheTags(data, ctx.fetchCache === true ? ctx.tags : undefined);

      const pipeline = redis.pipeline();
      pipeline.set(key, payload, 'EX', ttl);

      for (const tag of tags) {
        const tagKey = buildTagKey(tag);
        pipeline.sadd(tagKey, key);
        // The tag registry outlives the individual entries on purpose: it must
        // never expire before the entries it points at.
        pipeline.expire(tagKey, DEFAULT_TTL_SECONDS);
      }

      await pipeline.exec();
    } catch (error) {
      console.error(`${LOG_PREFIX} SET FAILED: ${key}`, (error as Error).message);
    }
  }

  /**
   * Hard invalidation: every key registered for one of the tags is unlinked,
   * mirroring `RedisCache.invalidateTags`. Optional `durations` (soft staleness)
   * are intentionally ignored - dropping the entry is always at least as fresh.
   */
  async revalidateTag(tags: string | string[]): Promise<void> {
    const tagList = typeof tags === 'string' ? [tags] : tags;
    if (tagList.length === 0) return;

    for (const tag of tagList) this.revalidatedTags.add(tag);

    const redis = this.redis;
    if (!redis) return;

    console.log(`${LOG_PREFIX} INVALIDATING: [${tagList.join(', ')}]`);

    for (const tag of tagList) {
      const tagKey = buildTagKey(tag);
      try {
        const keys = await redis.smembers(tagKey);
        if (keys.length === 0) continue;

        await redis.unlink(...keys);
        await redis.del(tagKey);
        console.log(`${LOG_PREFIX} CLEARED ${keys.length} keys for tag: ${tag}`);
      } catch (error) {
        console.warn(`${LOG_PREFIX} Invalidate tags failed for ${tag}:`, (error as Error).message);
      }
    }
  }

  /**
   * No per-request memoization is kept, so there is nothing to reset.
   */
  resetRequestCache(): void {
    // intentionally empty
  }
}

export default RedisIncrementalCache;
