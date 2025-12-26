/**
 * This is a Redis-based "use cache" handler with a filesystem fallback for build time.
 * It uses 'ioredis' to store cache entries.
 *
 * Includes simple debug logging.
 */

import { metrics, trace, ValueType } from '@opentelemetry/api';
import Redis from 'ioredis';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { CacheHandler } from './types.cjs';

// Define a simple logging prefix
const LOG_PREFIX = '[RedisCacheHandler]';

const meter = metrics.getMeter('nextjs-redis-cache-handler');
const cacheHitCounter = meter.createCounter('cache_hits_total', {
  description: 'Total number of cache hits',
  valueType: ValueType.INT,
});
const cacheMissCounter = meter.createCounter('cache_misses_total', {
  description: 'Total number of cache misses',
  valueType: ValueType.INT,
});
const cacheDurationHistogram = meter.createHistogram('cache_operation_duration_seconds', {
  description: 'Duration of cache operations',
  unit: 's',
});
const cacheInvalidationCounter = meter.createCounter('cache_invalidation_total', {
  description: 'Total number of cache invalidation events',
  valueType: ValueType.INT,
});

const noop = () => {};

interface CacheMetadata {
  timestamp: number;
  revalidate: number;
  tags?: string[];
  expire: number;
  stale?: number;
  [key: string]: unknown;
}

// Check if we are in the build phase
const isBuild =
  // eslint-disable-next-line n/no-process-env
  process.env['NEXT_PHASE'] === PHASE_PRODUCTION_BUILD ||
  process.env['NEXT_PHASE'] === 'phase-production-build' ||
  process.argv.includes('build');

// eslint-disable-next-line n/no-process-env
const REDIS_URL = process.env['REDIS_URL'] || 'redis://localhost:6379';

// Fallback cache directory
const FALLBACK_CACHE_DIR = path.join(process.cwd(), '.next/cache/redis-fallback');

// Helper to ensure directory exists
async function ensureFallbackDirectory() {
  try {
    await fs.mkdir(FALLBACK_CACHE_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

// Helper to get fallback file path
function getFallbackPath(key: string) {
  // Hash the key to avoid filename issues
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return path.join(FALLBACK_CACHE_DIR, `${hash}.json`);
}

// Helper to write to fallback cache atomically
async function writeToFallback(key: string, data: Buffer) {
  if (!isBuild) return; // ONLY write to fallback during build
  try {
    await ensureFallbackDirectory();
    const filePath = getFallbackPath(key);
    const temporaryPath = `${filePath}.tmp.${crypto.randomBytes(4).toString('hex')}`;

    await fs.writeFile(temporaryPath, data);
    await fs.rename(temporaryPath, filePath);

    // console.log(`${LOG_PREFIX} FALLBACK SET: ${key} (Written to disk)`);
  } catch (error) {
    console.error(`${LOG_PREFIX} FALLBACK SET ERROR: ${key}`, error);
  }
}

// Helper to read from fallback cache
async function readFromFallback(key: string): Promise<Buffer | undefined> {
  try {
    const filePath = getFallbackPath(key);
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return undefined;
    }
    const data = await fs.readFile(filePath);
    // console.log(`${LOG_PREFIX} FALLBACK GET: ${key} (Read from disk)`);
    return data;
  } catch (error) {
    console.error(`${LOG_PREFIX} FALLBACK GET ERROR: ${key}`, error);
    return undefined;
  }
}

export function createRedisCacheHandler(): CacheHandler {
  // During build, we DO NOT connect to Redis.
  // We mock the client to ensure code paths don't crash, but methods effectively "miss"
  // so that the fallback logic (filesystem) takes over.
  const redis = isBuild
    ? ({
        getBuffer: async () => {
          await Promise.resolve();
          // eslint-disable-next-line unicorn/no-null
          return null;
        },
        set: async () => {
          await Promise.resolve();
          return 'OK';
        },
        del: async () => {
          await Promise.resolve();
          return 0;
        },
        unlink: async () => {
          await Promise.resolve();
          return 0;
        },
        flushdb: async () => {
          await Promise.resolve();
          return 'OK';
        },
        pipeline: () => ({
          sadd: () => {},
          expire: () => {},
          exec: async () => {
            await Promise.resolve();
            return [];
          },
        }),
        on: () => {},
        smembers: async () => {
          await Promise.resolve();
          return [];
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as unknown as Redis)
    : new Redis(REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1, // Fail fast
        retryStrategy: (times) => {
          return Math.min(times * 50, 2000); // Retry with backoff
        },
      });

  if (!isBuild) {
    redis.on('error', (error) => {
      const redisError = error as Error & { code?: string };
      // Suppress connection errors if expected
      if (redisError.code === 'EAI_AGAIN' || redisError.code === 'ECONNREFUSED') {
      } else {
        console.error(`${LOG_PREFIX} Redis connection error:`, error);
      }
    });
  }

  const pendingSets = new Map<string, Promise<void>>();

  return {
    async get(cacheKey) {
      const startTime = performance.now();
      try {
        // Wait for any pending set for this key to complete
        const pendingPromise = pendingSets.get(cacheKey);
        if (pendingPromise) {
          await pendingPromise;
        }

        let data: Buffer | null | undefined;

        try {
          data = await redis.getBuffer(cacheKey);
        } catch (error) {
          console.warn(`${LOG_PREFIX} Redis GET failed: ${cacheKey}`, (error as Error).message);
          // Fallthrough to fallback
        }

        // If Redis missed or failed, try fallback
        if (!data) {
          data = await readFromFallback(cacheKey);
        }

        if (!data) {
          cacheMissCounter.add(1, { cache: 'redis' });
          cacheDurationHistogram.record((performance.now() - startTime) / 1000, {
            op: 'get',
            status: 'miss',
          });
          return;
        }

        try {
          // Safety check for empty or malformed buffers from file read
          if (data.length < 4) {
            // Treat as miss/corrupt
            cacheMissCounter.add(1, { cache: 'redis', reason: 'corrupt_data' });
            return;
          }

          // The stored data is: [metadata_json_length (4 bytes)][metadata_json][value_binary]
          const metadataLength = data.readUInt32BE(0);
          const metadataJson = data.toString('utf8', 4, 4 + metadataLength);
          const metadata = JSON.parse(metadataJson) as CacheMetadata;
          const valueBuffer = data.subarray(4 + metadataLength);

          // Check if the entry is expired based on its revalidate time.
          const now = performance.timeOrigin + performance.now();
          const expirationTime = metadata.timestamp + metadata.revalidate * 1000;

          if (now > expirationTime) {
            console.log(`${LOG_PREFIX} GET: ${cacheKey} (EXPIRED)`);
            setImmediate(() => {
              cacheMissCounter.add(1, { cache: 'redis', reason: 'expired' });
              cacheDurationHistogram.record((performance.now() - startTime) / 1000, {
                op: 'get',
                status: 'expired',
              });
              // Entry is expired. Try to remove it from Redis (fire and forget)
              redis.del(cacheKey).catch(() => {});
            });
            return;
          }

          // console.log(`${LOG_PREFIX} GET: ${cacheKey} (HIT)`);
          setImmediate(() => {
            cacheHitCounter.add(1, { cache: 'redis' });
            cacheDurationHistogram.record((performance.now() - startTime) / 1000, {
              op: 'get',
              status: 'hit',
            });
          });

          // Create a ReadableStream from the Buffered value
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new Uint8Array(valueBuffer));
              controller.close();
            },
          });

          return {
            ...metadata,
            tags: metadata.tags || [],
            stale: metadata.stale || 0, // Default to 0 if not present
            value: stream,
          };
        } catch (error) {
          console.error(`${LOG_PREFIX} Error parsing cached data: ${cacheKey}`, error);
          setImmediate(() => {
            cacheMissCounter.add(1, { cache: 'redis', reason: 'error_parsing' });
            cacheDurationHistogram.record((performance.now() - startTime) / 1000, {
              op: 'get',
              status: 'error',
            });
          });
          return;
        }
      } catch (error) {
        // Catch-all for unexpected errors at the top level of get()
        cacheDurationHistogram.record((performance.now() - startTime) / 1000, {
          op: 'get',
          status: 'error_top_level',
        });
        throw error;
      }
    },

    async set(cacheKey, pendingEntry) {
      let resolvePending: () => void = noop;
      const pendingPromise = new Promise<void>((resolve) => {
        resolvePending = resolve;
      });
      pendingSets.set(cacheKey, pendingPromise);

      try {
        const entry = await pendingEntry;

        // Drain the stream into a Buffer
        const chunks: Uint8Array[] = [];
        const reader = entry.value.getReader();
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        const valueBuffer = Buffer.concat(chunks);

        // Prepare metadata (excluding the stream)
        const { value: _value, ...metadata } = entry;
        const metadataJson = JSON.stringify(metadata);
        const metadataBuffer = Buffer.from(metadataJson, 'utf8');

        // Total buffer: [metadata_len (4 bytes)][metadata][value]
        const totalLength = 4 + metadataBuffer.length + valueBuffer.length;
        const finalBuffer = Buffer.allocUnsafe(totalLength);
        finalBuffer.writeUInt32BE(metadataBuffer.length, 0);
        metadataBuffer.copy(finalBuffer, 4);
        valueBuffer.copy(finalBuffer, 4 + metadataBuffer.length);

        try {
          // Use PXAT to set absolute expiration time if possible,
          // or just set with TTL. Next.js uses 'expire' (seconds).
          // Let's use the 'expire' field for Redis TTL.
          await (entry.expire > 0
            ? redis.set(cacheKey, finalBuffer, 'EX', entry.expire)
            : redis.set(cacheKey, finalBuffer));

          // Track tags for granular invalidation
          if (metadata.tags && metadata.tags.length > 0) {
            const pipeline = redis.pipeline();
            for (const tag of metadata.tags) {
              pipeline.sadd(`tags:${tag}`, cacheKey);
              // Set expiration for the tag set to be slightly longer than the entry
              if (entry.expire > 0) {
                pipeline.expire(`tags:${tag}`, entry.expire + 60);
              }
            }
            await pipeline.exec();
          }

          console.log(`${LOG_PREFIX} SET: ${cacheKey} (SUCCESS)`);
        } catch (error) {
          console.error(`${LOG_PREFIX} SET Redis failed: ${cacheKey}`, (error as Error).message);
        }

        // In build mode, we ALWAYS write to fallback to ensure artifacts are persisted to disk
        // and included in the build image, regardless of Redis availability.
        if (isBuild) {
          await writeToFallback(cacheKey, finalBuffer);
        }
      } catch (error) {
        console.error(`${LOG_PREFIX} SET: ${cacheKey} (FAILED)`, error);
      } finally {
        resolvePending();
        pendingSets.delete(cacheKey);
      }
    },

    async updateTags(tags: string[]) {
      console.log(`${LOG_PREFIX} UPDATE_TAGS: ${tags.join(', ')}.`);

      try {
        for (const tag of tags) {
          const tagKey = `tags:${tag}`;

          // If 'payload' tag is invalidated, we might want to be aggressive,
          // but let's try to be selective first.
          const keys = await redis.smembers(tagKey);

          if (keys.length > 0) {
            let reason = 'tag_invalidation';
            if (tag.startsWith('details-')) {
              reason = 'cms_page_update';
            } else if (tag.startsWith('list-')) {
              reason = 'cms_list_update';
            }
            const spanContext = trace.getActiveSpan()?.spanContext();
            const traceId = spanContext?.traceId || '';
            const spanId = spanContext?.spanId || '';

            console.log(
              `${LOG_PREFIX} CACHE_INVALIDATION: {"tag": "${tag}", "reason": "${reason}", "keys_cleared": ${keys.length}, "trace_id": "${traceId}", "span_id": "${spanId}"}`,
            );
            // UNLINK is non-blocking (unlike DEL)
            await redis.unlink(...keys);
            await redis.del(tagKey);
            cacheInvalidationCounter.add(1, { type: 'tag', tag });
          } else if (tag === 'payload') {
            // Fallback if 'payload' is invalidated but no keys tracked (e.g. after restart)
            const spanContext = trace.getActiveSpan()?.spanContext();
            const traceId = spanContext?.traceId || '';
            const spanId = spanContext?.spanId || '';

            console.log(
              `${LOG_PREFIX} CACHE_INVALIDATION: {"tag": "payload", "reason": "full_flush_fallback", "keys_cleared": -1, "trace_id": "${traceId}", "span_id": "${spanId}"}`,
            );
            console.log(
              `${LOG_PREFIX} UPDATE_TAGS: 'payload' tag cleared but no keys found in set. Flushing DB.`,
            );
            await redis.flushdb();
            cacheInvalidationCounter.add(1, { type: 'full_flush', tag });
          } else {
            const spanContext = trace.getActiveSpan()?.spanContext();
            const traceId = spanContext?.traceId || '';
            const spanId = spanContext?.spanId || '';
            console.log(
              `${LOG_PREFIX} CACHE_INVALIDATION: {"tag": "${tag}", "reason": "tag_invalidation", "keys_cleared": 0, "trace_id": "${traceId}", "span_id": "${spanId}"}`,
            );
            cacheInvalidationCounter.add(1, { type: 'tag_empty', tag });
          }
        }
      } catch (error) {
        console.log(`${LOG_PREFIX} UPDATE_TAGS failed: ${(error as Error).message}`);
      }
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async getExpiration() {
      // Return 0 to indicate we don't handle soft tags specially yet,
      // matching default behavior.
      return 0;
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async refreshTags() {
      // No-op, matching default behavior.
      return;
    },

    async revalidateTag(tag: string) {
      console.log(`${LOG_PREFIX} REVALIDATE_TAG: ${tag}.Delegating to updateTags.`);
      await this.updateTags([tag]);
    },
  };
}

export default createRedisCacheHandler();
