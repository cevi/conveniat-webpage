import { BaseCacheHandler } from '@/cache-handlers/handlers/base';
import type { CacheEntry } from '@/cache-handlers/types';
import { createLogger } from '@/utils/server-logger';
import { metrics, ValueType } from '@opentelemetry/api';
import Redis from 'ioredis';

const logger = createLogger('cache:redis');
// eslint-disable-next-line n/no-process-env
const REDIS_URL = process.env['REDIS_URL'] || 'redis://localhost:6379';

const meter = metrics.getMeter('nextjs-redis-cache');
const cacheInvalidationCounter = meter.createCounter('cache_invalidation_total', {
  valueType: ValueType.INT,
});

export class RedisCache extends BaseCacheHandler {
  name = 'Redis';
  private redis: Redis;

  constructor() {
    super();
    this.redis = new Redis(REDIS_URL, {
      lazyConnect: true,
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
      retryStrategy: (times: number): number | void | null => Math.min(times * 50, 2000),
    });

    this.redis.on('error', (error: { code: string }) => {
      if (error.code !== 'EAI_AGAIN') {
        logger.error('Connection error', { error });
      }
    });
  }

  async get(key: string): Promise<{ value: Buffer; metadata?: Partial<CacheEntry> } | undefined> {
    try {
      const data = await this.redis.getBuffer(key);
      if (!data) return;

      return this.deserialize(data);
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
    for (const tag of tags) {
      const tagKey = `tags:${tag}`;
      try {
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
}
