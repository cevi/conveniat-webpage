/**
 * src/cache-handlers/default.cts
 */
import { FileSystemCache } from '@/cache-handlers/handlers/file-system';
import { RedisCache } from '@/cache-handlers/handlers/redis';
import type { CacheEntry, CacheOrchestrator, Timestamp } from '@/cache-handlers/types';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';

const isBuild =
  // eslint-disable-next-line n/no-process-env
  process.env['NEXT_PHASE'] === PHASE_PRODUCTION_BUILD || process.argv.includes('build');

export class Orchestrator implements CacheOrchestrator {
  private readonly fsCache: FileSystemCache;
  private readonly redisCache: RedisCache | undefined;
  private readonly pendingSets = new Map<string, Promise<void>>();
  private readonly instanceId = Math.random().toString(36).slice(7);

  constructor() {
    console.log(
      `[Orchestrator] Initializing Cache Manager - Mode: ${isBuild ? 'BUILD' : 'RUNTIME'} (PID: ${process.pid}, Instance: ${this.instanceId})`,
    );
    this.fsCache = new FileSystemCache();

    if (!isBuild) {
      this.redisCache = new RedisCache();
    }

    console.log(
      `[Orchestrator] Cache Manager initialized with layers: ${isBuild ? 'FileSystem' : 'Redis, FileSystem'}`,
    );
  }

  /**
   * Note: We ignore 'softTags' mostly because we rely on hard eviction (deleting keys)
   * in updateTags. If a key exists, it is valid.
   */
  async get(cacheKey: string): Promise<CacheEntry | undefined> {
    // Wait for any pending writes to complete
    // This prevents race conditions where we read a file that is currently being written
    const pendingPromise = this.pendingSets.get(cacheKey);
    if (pendingPromise) {
      await pendingPromise;
    }

    // Try Redis First (Runtime only)
    if (!isBuild && this.redisCache) {
      const redisResult = await this.redisCache.get(cacheKey);
      if (redisResult) {
        return this.hydrateEntry(redisResult.value, redisResult.metadata);
      }
    }

    // Try FileSystem Second (Fallback/Immutable)
    const fsResult = await this.fsCache.get(cacheKey);
    if (fsResult) {
      return this.hydrateEntry(fsResult.value, fsResult.metadata);
    }

    return undefined;
  }

  async set(cacheKey: string, pendingEntry: Promise<CacheEntry>): Promise<void> {
    // Create a lock for this key
    // eslint-disable-next-line unicorn/consistent-function-scoping
    let resolveLock: () => void = (): void => {};
    const lock = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    this.pendingSets.set(cacheKey, lock);

    try {
      // Await the pending entry to get access to the stream and metadata
      const entry = await pendingEntry;

      // Consume the stream into a Buffer
      const chunks: Uint8Array[] = [];
      const reader = entry.value.getReader();

      try {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (value) chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }

      const valueBuffer = Buffer.concat(chunks);

      if (isBuild) {
        // Write to FileSystem (Build)
        await this.fsCache.set(cacheKey, valueBuffer, entry);
      } else {
        // Persist to appropriate layer
        if (!this.redisCache) {
          console.warn('[Orchestrator] RedisCache not initialized for SET operation');
          return;
        }
        await this.redisCache.set(cacheKey, valueBuffer, entry);
      }
    } catch (error) {
      console.error(`[Orchestrator] SET Error for ${cacheKey}:`, error);
    } finally {
      resolveLock();
      this.pendingSets.delete(cacheKey);
    }
  }

  /**
   * TAG MANAGEMENT methods
   */

  async refreshTags(): Promise<void> {
    // No-op for our strategy (we use direct Redis commands)
    // eslint-disable-next-line unicorn/no-useless-promise-resolve-reject
    return Promise.resolve();
  }

  async getExpiration(): Promise<Timestamp> {
    // We return 0 or Infinity.
    // Returning 0 implies "tags are never stale" unless explicitly deleted.
    // Since we delete keys in 'updateTags', we can assume any key found is valid.
    // eslint-disable-next-line unicorn/no-useless-promise-resolve-reject
    return Promise.resolve(0);
  }

  async updateTags(tags: string[]): Promise<void> {
    // This is called when revalidation happens.
    // We strictly invalidate the keys associated with these tags.
    if (!this.redisCache) {
      console.warn('[Orchestrator] RedisCache not initialized for tag update');
      return;
    }
    await this.redisCache.invalidateTags(tags);
  }

  async revalidateTag(tag: string): Promise<void> {
    // Manually trigger invalidation
    if (!this.redisCache) {
      console.warn('[Orchestrator] RedisCache not initialized for tag update');
      return;
    }
    await this.redisCache.invalidateTags([tag]);
  }

  /**
   * Helper to reconstruct the CacheEntry from Buffer + Metadata
   */
  private hydrateEntry(valueBuffer: Buffer, metadata?: Partial<CacheEntry>): CacheEntry {
    return {
      value: this.createStream(valueBuffer),
      timestamp: metadata?.timestamp || Date.now(),
      revalidate: metadata?.revalidate || 0,
      tags: metadata?.tags || [],
      expire: metadata?.expire || 0,
      stale: metadata?.stale || 0,
    };
  }

  private createStream(buffer: Buffer): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start(controller: ReadableStreamDefaultController<Uint8Array>): void {
        controller.enqueue(new Uint8Array(buffer));
        controller.close();
      },
    });
  }
}

declare global {
  var cacheOrchestrator: Orchestrator | undefined;
}

const cacheOrchestrator = globalThis.cacheOrchestrator ?? new Orchestrator();

if (!isBuild) {
  globalThis.cacheOrchestrator = cacheOrchestrator;
}

export default cacheOrchestrator;
