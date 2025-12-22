/**
 * This is a Redis-based "use cache" handler.
 * It uses 'ioredis' to store cache entries.
 *
 * Includes simple debug logging.
 */

import Redis from 'ioredis';
import { CacheHandler } from './types.cjs';

// Define a simple logging prefix
const LOG_PREFIX = '[RedisCacheHandler]';

const REDIS_URL = process.env['REDIS_URL'] || 'redis://localhost:6379';

export function createRedisCacheHandler(): CacheHandler {
    const redis = new Redis(REDIS_URL);
    const pendingSets = new Map<string, Promise<void>>();

    redis.on('error', (err) => {
        console.error(`${LOG_PREFIX} Redis connection error:`, err);
    });

    return {
        async get(cacheKey) {
            // Wait for any pending set for this key to complete
            const pendingPromise = pendingSets.get(cacheKey);
            if (pendingPromise) {
                console.log(`${LOG_PREFIX} GET: ${cacheKey} (waiting for pending set)`);
                await pendingPromise;
            }

            try {
                const data = await redis.getBuffer(cacheKey);
                if (!data) {
                    console.log(`${LOG_PREFIX} GET: ${cacheKey} (MISS)`);
                    return;
                }

                // The stored data is: [metadata_json_length (4 bytes)][metadata_json][value_binary]
                const metadataLength = data.readUInt32BE(0);
                const metadataJson = data.toString('utf8', 4, 4 + metadataLength);
                const metadata = JSON.parse(metadataJson);
                const valueBuffer = data.subarray(4 + metadataLength);

                // Check if the entry is expired based on its revalidate time.
                const now = performance.timeOrigin + performance.now();
                const expirationTime = metadata.timestamp + metadata.revalidate * 1000;

                if (now > expirationTime) {
                    console.log(`${LOG_PREFIX} GET: ${cacheKey} (EXPIRED)`);
                    // Entry is expired, remove it from the cache.
                    await redis.del(cacheKey);
                    return;
                }

                console.log(`${LOG_PREFIX} GET: ${cacheKey} (HIT)`);

                // Create a ReadableStream from the Buffered value
                const stream = new ReadableStream({
                    start(controller) {
                        controller.enqueue(new Uint8Array(valueBuffer));
                        controller.close();
                    },
                });

                return {
                    ...metadata,
                    value: stream,
                };
            } catch (error) {
                console.error(`${LOG_PREFIX} GET: ${cacheKey} (ERROR)`, error);
                return;
            }
        },

        async set(cacheKey, pendingEntry) {
            let resolvePending: () => void = () => { };
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
                console.error(`${LOG_PREFIX} SET: ${cacheKey} (FAILED)`, error);
            } finally {
                resolvePending();
                pendingSets.delete(cacheKey);
            }
        },

        async updateTags(tags: string[]) {
            console.log(`${LOG_PREFIX} UPDATE_TAGS: ${tags.join(', ')}.`);

            for (const tag of tags) {
                const tagKey = `tags:${tag}`;

                // If 'payload' tag is invalidated, we might want to be aggressive,
                // but let's try to be selective first.
                const keys = await redis.smembers(tagKey);

                if (keys.length > 0) {
                    console.log(`${LOG_PREFIX} UPDATE_TAGS: Clearing ${keys.length} keys for tag ${tag}`);
                    // UNLINK is non-blocking (unlike DEL)
                    await redis.unlink(...keys);
                    await redis.del(tagKey);
                } else if (tag === 'payload') {
                    // Fallback if 'payload' is invalidated but no keys tracked (e.g. after restart)
                    console.log(`${LOG_PREFIX} UPDATE_TAGS: 'payload' tag cleared but no keys found in set. Flushing DB.`);
                    await redis.flushdb();
                }
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
    };
}

export default createRedisCacheHandler();
