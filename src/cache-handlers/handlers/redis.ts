import { BaseCacheHandler } from '@/cache-handlers/handlers/base';
import type { CacheEntry } from '@/cache-handlers/types';
import { createLogger } from '@/utils/server-logger';
import { metrics, ValueType } from '@opentelemetry/api';
import Redis from 'ioredis';

const logger = createLogger('cache:redis');
// eslint-disable-next-line n/no-process-env
const REDIS_URL = process.env['REDIS_URL'] || 'redis://localhost:6379';

/**
 * Prefix of the key holding the time a tag was last flushed, in milliseconds. It has no TTL,
 * because an entry may live for as long as `INFINITE_CACHE`, and there is one per tag ever flushed.
 */
const FLUSHED_AT_PREFIX = 'flushed-at:';

/**
 * How long a command may take before ioredis rejects it. `connectTimeout` and
 * `maxRetriesPerRequest` only act when the connection drops; a Redis that stays connected but
 * stops answering would otherwise hold every `'use cache'` read, and with it the render. A read
 * that times out is a miss, so the page renders without the cache.
 */
export const COMMAND_TIMEOUT_MS = 1000;

const meter = metrics.getMeter('nextjs-redis-cache');
const cacheInvalidationCounter = meter.createCounter('cache_invalidation_total', {
  valueType: ValueType.INT,
});

/** A connection to the Redis that holds the cache entries and the tag flush times. */
export const createCacheRedisClient = (): Redis => {
  const redis = new Redis(REDIS_URL, {
    lazyConnect: true,
    connectTimeout: 2000,
    commandTimeout: COMMAND_TIMEOUT_MS,
    maxRetriesPerRequest: 1,
    retryStrategy: (times: number): number | void | null => Math.min(times * 50, 2000),
  });

  redis.on('error', (error: { code: string }) => {
    if (error.code !== 'EAI_AGAIN') {
      logger.error('Connection error', { error });
    }
  });
  return redis;
};

/**
 * The time each tag was last flushed by any replica, in milliseconds, in the order of `tags`;
 * `undefined` for a tag never flushed.
 */
export const readFlushedAt = async (
  redis: Redis,
  tags: string[],
): Promise<(number | undefined)[]> => {
  const values = await redis.mget(tags.map((tag) => `${FLUSHED_AT_PREFIX}${tag}`));
  return values.map((value) => (value === null ? undefined : Number(value)));
};

export class RedisCache extends BaseCacheHandler {
  name = 'Redis';
  private redis: Redis;

  constructor() {
    super();
    this.redis = createCacheRedisClient();
  }

  async get(key: string): Promise<{ value: Buffer; metadata?: Partial<CacheEntry> } | undefined> {
    try {
      const data = await this.redis.getBuffer(key);
      if (!data) return;

      const entry = this.deserialize(data);
      if (!entry || (await this.wasFlushedAfterRender(entry.metadata))) return;
      return entry;
    } catch (error) {
      logger.warn('GET failed', { 'cache.key': key, error });
      return;
    }
  }

  async set(key: string, value: Buffer, metadata: CacheEntry): Promise<void> {
    // Fires on every cache write; the dominant source of log volume before #1525.
    logger.debug('SET called', { 'cache.key': key });

    try {
      // Use base class helper
      const finalBuffer = this.serialize(value, metadata);

      const ttl = metadata.expire || metadata.revalidate || 31_536_000;
      const pipeline = this.redis.pipeline();

      if (ttl > 0) {
        pipeline.set(key, finalBuffer, 'EX', ttl);
      } else {
        pipeline.set(key, finalBuffer);
      }

      if (metadata.tags.length > 0) {
        for (const tag of metadata.tags) {
          pipeline.sadd(`tags:${tag}`, key);
          if (ttl > 0) pipeline.expire(`tags:${tag}`, ttl);
        }
      }

      await pipeline.exec();
    } catch (error) {
      logger.error('SET failed', { 'cache.key': key, error });
    }
  }

  async invalidateTags(tags: string[]): Promise<void> {
    logger.info('Invalidating tags', { 'cache.tags': tags.join(', ') });
    const flushedAt = Date.now();
    for (const tag of tags) {
      const tagKey = `tags:${tag}`;
      try {
        // Before the delete, so a render still running writes an entry that `get` refuses.
        await this.redis.set(`${FLUSHED_AT_PREFIX}${tag}`, flushedAt);
        const keys = await this.redis.smembers(tagKey);

        if (keys.length > 0) {
          await this.redis.unlink(...keys);
          await this.redis.del(tagKey);
          cacheInvalidationCounter.add(1, { type: 'tag', tag });
          logger.debug(`Cleared ${keys.length} keys for tag ${tag}`, {
            'cache.tag': tag,
            'cache.cleared_keys': keys.length,
            'cache.keys': keys.join(', '),
          });
        } else {
          logger.debug(`No keys for tag ${tag}, skipping`, { 'cache.tag': tag });
        }
      } catch (error) {
        logger.warn('Invalidate tags failed', { 'cache.tag': tag, error });
      }
    }
  }

  /**
   * Whether one of the entry's tags was flushed after its render started.
   *
   * Deleting the keys of a tag is not enough: a render that read the old data before the flush
   * finishes after it and writes its entry back, which then lives until its TTL runs out. Next.js
   * stamps every entry with the time its render started, so such an entry is older than the flush.
   */
  private async wasFlushedAfterRender(metadata: CacheEntry): Promise<boolean> {
    // `deserialize` does not validate the metadata.
    const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
    if (tags.length === 0 || typeof metadata.timestamp !== 'number') return false;

    const flushedAt = await readFlushedAt(this.redis, tags);
    const isStale = flushedAt.some((value) => value !== undefined && value >= metadata.timestamp);
    if (isStale) {
      logger.debug('Discarding an entry rendered before a flush of its tags', {
        'cache.tags': tags.join(', '),
      });
    }
    return isStale;
  }
}
