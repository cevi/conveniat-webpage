import { Orchestrator } from '@/cache-handlers/orchestrator';
import type { CacheEntry } from '@/cache-handlers/types';

interface FakePipeline {
  set: (key: string, value: Buffer) => FakePipeline;
  sadd: (key: string, member: string) => FakePipeline;
  expire: () => FakePipeline;
  exec: () => Promise<[]>;
}

/** Just enough of ioredis for the cache handler, held in memory. */
jest.mock('ioredis', () => {
  class FakeRedis {
    private readonly strings = new Map<string, Buffer>();
    private readonly sets = new Map<string, Set<string>>();

    on(): this {
      return this;
    }

    getBuffer(key: string): Promise<Buffer | null> {
      // eslint-disable-next-line unicorn/no-null -- ioredis answers a missing key with null
      return Promise.resolve(this.strings.get(key) ?? null);
    }

    set(key: string, value: Buffer | string | number): Promise<'OK'> {
      this.strings.set(key, Buffer.isBuffer(value) ? value : Buffer.from(String(value)));
      return Promise.resolve('OK');
    }

    mget(keys: string[]): Promise<(string | null)[]> {
      // eslint-disable-next-line unicorn/no-null -- ioredis answers a missing key with null
      return Promise.resolve(keys.map((key) => this.strings.get(key)?.toString() ?? null));
    }

    smembers(key: string): Promise<string[]> {
      return Promise.resolve([...(this.sets.get(key) ?? [])]);
    }

    unlink(...keys: string[]): Promise<number> {
      for (const key of keys) this.strings.delete(key);
      return Promise.resolve(keys.length);
    }

    del(key: string): Promise<number> {
      this.sets.delete(key);
      return Promise.resolve(1);
    }

    pipeline(): FakePipeline {
      const commands: (() => void)[] = [];
      const pipeline: FakePipeline = {
        set: (key: string, value: Buffer): FakePipeline => {
          commands.push(() => this.strings.set(key, value));
          return pipeline;
        },
        sadd: (key: string, member: string): FakePipeline => {
          commands.push(() => this.sets.set(key, (this.sets.get(key) ?? new Set()).add(member)));
          return pipeline;
        },
        expire: (): FakePipeline => pipeline,
        exec: (): Promise<[]> => {
          for (const command of commands) command();
          return Promise.resolve([]);
        },
      };
      return pipeline;
    }
  }
  return { __esModule: true, default: FakeRedis };
});

const KEY = 'page:/de/programm';
const TAG = 'doc:generic-page:42';

/** An entry of a render that started at `timestamp`, with its body still being streamed. */
const startRender = (
  timestamp: number,
): { entry: Promise<CacheEntry>; finish: (body: string) => void } => {
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
  const value = new ReadableStream<Uint8Array>({
    start(streamController): void {
      controller = streamController;
    },
  });
  return {
    entry: Promise.resolve({
      value,
      tags: [TAG],
      timestamp,
      revalidate: 3600,
      expire: 86_400,
      stale: 300,
    }),
    finish: (body: string): void => {
      controller?.enqueue(new TextEncoder().encode(body));
      controller?.close();
    },
  };
};

const readBody = async (entry: CacheEntry | undefined): Promise<string | undefined> =>
  entry ? await new Response(entry.value).text() : undefined;

describe('Orchestrator', () => {
  it('refuses an entry whose render overlapped a flush of its tag', async () => {
    const cache = new Orchestrator();
    const render = startRender(Date.now() - 1000);
    const written = cache.set(KEY, render.entry);

    await cache.updateTags([TAG]);
    render.finish('before the edit');
    await written;

    expect(await cache.get(KEY)).toBeUndefined();
  });

  it('serves an entry rendered after the flush', async () => {
    const cache = new Orchestrator();
    await cache.updateTags([TAG]);

    const render = startRender(Date.now() + 1);
    const written = cache.set(KEY, render.entry);
    render.finish('after the edit');
    await written;

    expect(await readBody(await cache.get(KEY))).toBe('after the edit');
  });

  it('serves an entry whose tag was never flushed', async () => {
    const cache = new Orchestrator();
    const render = startRender(Date.now());
    const written = cache.set(KEY, render.entry);
    render.finish('untouched');
    await written;

    expect(await readBody(await cache.get(KEY))).toBe('untouched');
  });
});
