import { metrics, ValueType } from '@opentelemetry/api';
import Redis from 'ioredis';
import { CacheEntry } from '../types.cjs';
import { BaseCacheHandler } from './base.cjs';

const LOG_PREFIX = '[RedisCache]';
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
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.redis.on('error', (error: { code: string }) => {
      if (error.code !== 'EAI_AGAIN') {
        console.error(`${LOG_PREFIX} Connection Error`, error);
      }
    });
  }

  async get(key: string) {
    try {
      const data = await this.redis.getBuffer(key);
      if (!data) return;

      return this.deserialize(data);
    } catch (error) {
      console.warn(`${LOG_PREFIX} GET FAILED: ${key}`, (error as Error).message);
      return;
    }
  }

  async set(key: string, value: Buffer, metadata: CacheEntry): Promise<void> {
    console.log(`${LOG_PREFIX} SET CALLED: ${key}`);

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

      if (metadata.tags && metadata.tags.length > 0) {
        for (const tag of metadata.tags) {
          pipeline.sadd(`tags:${tag}`, key);
          if (ttl > 0) pipeline.expire(`tags:${tag}`, ttl);
        }
      }

      await pipeline.exec();
    } catch (error) {
      console.error(`${LOG_PREFIX} SET FAILED: ${key}`, (error as Error).message);
    }
  }

  async invalidateTags(tags: string[]) {
    console.log(`${LOG_PREFIX} INVALIDATING: [${tags.join(', ')}]`);
    for (const tag of tags) {
      const tagKey = `tags:${tag}`;
      const keys = await this.redis.smembers(tagKey);

      if (keys.length > 0) {
        await this.redis.unlink(...keys);
        await this.redis.del(tagKey);
        cacheInvalidationCounter.add(1, { type: 'tag', tag });
        console.log(
          `${LOG_PREFIX} CLEARED ${keys.length} keys for tag: ${tag} [${keys.join(', ')}]`,
        );
      } else {
        console.log(`${LOG_PREFIX} NO KEYS for tag: ${tag} (Skipping)`);
      }
    }
  }
}
