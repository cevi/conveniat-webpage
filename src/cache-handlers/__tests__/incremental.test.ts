import IncrementalCache from '@/cache-handlers/incremental';
import type { CacheHandlerValue } from 'next/dist/server/lib/incremental-cache';
import {
  areTagsStale,
  tagsManifest,
} from 'next/dist/server/lib/incremental-cache/tags-manifest.external';

/**
 * The Redis both replicas share, holding only what this handler reads: the `flushed-at:` times
 * the `'use cache'` handler writes on every `revalidateTag()`. `failing` makes reads reject, `hanging`
 * makes them never answer.
 */
const sharedRedis = { values: new Map<string, string>(), failing: false, hanging: false };

jest.mock('ioredis', () => {
  class FakeRedis {
    on(): this {
      return this;
    }

    mget(keys: string[]): Promise<(string | null)[]> {
      if (sharedRedis.failing) return Promise.reject(new Error('connection refused'));
      if (sharedRedis.hanging) return new Promise(() => {});
      return Promise.resolve(keys.map((key) => sharedRedis.values.get(key) ?? null));
    }
  }
  return { __esModule: true, default: FakeRedis };
});

const ROUTE_KEY = '/de/app';
const TAGS = ['payload', 'global:footer'];

/** A handler as Next.js builds one per request, keeping entries in memory only. */
const createHandler = (): IncrementalCache =>
  new IncrementalCache({
    fs: {} as never,
    serverDistDir: '/nonexistent',
    flushToDisk: false,
    maxMemoryCacheSize: 1024 * 1024,
    revalidatedTags: [],
  } as never);

/** Stores a shell carrying `TAGS`, the way Next.js does after rendering a page. */
const storeShell = async (handler: IncrementalCache): Promise<void> => {
  await handler.set(
    ROUTE_KEY,
    {
      kind: 'APP_ROUTE',
      body: Buffer.from('<footer>old</footer>'),
      status: 200,
      headers: { 'x-next-cache-tags': TAGS.join(',') },
    } as never,
    { cacheControl: { revalidate: false, expire: undefined } } as never,
  );
};

const readShell = async (handler: IncrementalCache): Promise<CacheHandlerValue> => {
  const entry = await handler.get(ROUTE_KEY, { kind: 'APP_ROUTE' } as never);
  if (entry === null) throw new Error('the shell is gone');
  return entry;
};

/** What Next.js asks right after the handler returns a shell. */
const isStale = (entry: CacheHandlerValue): boolean => areTagsStale(TAGS, entry.lastModified);

describe('IncrementalCache', () => {
  beforeEach(() => {
    sharedRedis.values.clear();
    sharedRedis.failing = false;
    sharedRedis.hanging = false;
    tagsManifest.clear();
  });

  it('keeps a shell fresh while none of its tags was flushed', async () => {
    const handler = createHandler();
    await storeShell(handler);

    expect(isStale(await readShell(handler))).toBe(false);
  });

  it('marks a shell stale once the other replica flushed one of its tags', async () => {
    const handler = createHandler();
    await storeShell(handler);
    const shell = await readShell(handler);
    expect(isStale(shell)).toBe(false);

    // What `revalidateTag('global:footer')` on the other replica leaves behind in Redis.
    sharedRedis.values.set('flushed-at:global:footer', String(shell.lastModified + 1));

    expect(isStale(await readShell(createHandler()))).toBe(true);
  });

  it('keeps the shell rendered after the flush fresh', async () => {
    sharedRedis.values.set('flushed-at:global:footer', String(Date.now() - 1000));
    const handler = createHandler();
    await storeShell(handler);

    expect(isStale(await readShell(handler))).toBe(false);
  });

  it('serves the local shell while Redis is down', async () => {
    const handler = createHandler();
    await storeShell(handler);
    sharedRedis.failing = true;

    const shell = await readShell(handler);
    expect(isStale(shell)).toBe(false);
  });

  it('serves the local shell when Redis does not answer', async () => {
    const handler = createHandler();
    await storeShell(handler);
    sharedRedis.hanging = true;

    const started = performance.now();
    const shell = await readShell(handler);
    expect(performance.now() - started).toBeLessThan(1000);
    expect(isStale(shell)).toBe(false);
  });
});
