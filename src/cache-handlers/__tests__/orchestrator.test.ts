import { Orchestrator } from '@/cache-handlers/orchestrator';
import type { CacheEntry } from '@/cache-handlers/types';
import { metrics, trace } from '@opentelemetry/api';
import { PrometheusExporter, PrometheusSerializer } from '@opentelemetry/exporter-prometheus';
import { metrics as sdkMetrics } from '@opentelemetry/sdk-node';
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';

/** A key whose read fails as if Redis had stopped answering. Hoisted into the mock below. */
const UNREACHABLE_KEY = 'unreachable';

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
      if (key === UNREACHABLE_KEY) return Promise.reject(new Error('Command timed out'));
      return Promise.resolve(this.strings.get(key) ?? null);
    }

    set(key: string, value: Buffer | string | number): Promise<'OK'> {
      this.strings.set(key, Buffer.isBuffer(value) ? value : Buffer.from(String(value)));
      return Promise.resolve('OK');
    }

    mget(keys: string[]): Promise<(string | null)[]> {
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

/** Writes a finished entry rendered at `timestamp`. */
const writeEntry = async (cache: Orchestrator, key: string, timestamp: number): Promise<void> => {
  const render = startRender(timestamp);
  const written = cache.set(key, render.entry);
  render.finish('body');
  await written;
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

describe('Orchestrator telemetry', () => {
  const exporter = new PrometheusExporter({ preventServerStart: true });
  const spans = new InMemorySpanExporter();
  const tracer = new BasicTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(spans)],
  }).getTracer('test');

  beforeAll(() => {
    metrics.setGlobalMeterProvider(new sdkMetrics.MeterProvider({ readers: [exporter] }));
  });

  afterAll(() => {
    metrics.disable();
  });

  const scrape = async (): Promise<string> => {
    const { resourceMetrics } = await exporter.collect();
    return new PrometheusSerializer().serialize(resourceMetrics);
  };

  /** The `cache.lookup` events a lookup of `key` adds to the span that asked. */
  const lookUp = async (
    cache: Orchestrator,
    key: string,
  ): Promise<Record<string, unknown> | undefined> => {
    const span = tracer.startSpan('trpc.query schedule.getScheduleEntries');
    const active = jest.spyOn(trace, 'getActiveSpan').mockReturnValue(span);
    try {
      await cache.get(key);
    } finally {
      active.mockRestore();
      span.end();
    }
    const finished = spans.getFinishedSpans().at(-1);
    return finished?.events.find((event) => event.name === 'cache.lookup')?.attributes;
  };

  it('tells a fresh, a stale, a missing and an unreachable entry apart', async () => {
    const cache = new Orchestrator();
    await writeEntry(cache, 'fresh', Date.now());
    // revalidate is an hour and expire a day: two hours old is served stale and refreshed
    await writeEntry(cache, 'stale', Date.now() - 2 * 3600 * 1000);

    expect(await lookUp(cache, 'fresh')).toMatchObject({
      'cache.result': 'hit',
      'cache.tags': [TAG],
    });
    expect(await lookUp(cache, 'stale')).toMatchObject({
      'cache.result': 'stale',
      'cache.age_seconds': 7200,
    });
    expect(await lookUp(cache, 'absent')).toMatchObject({ 'cache.result': 'miss' });
    expect(await lookUp(cache, UNREACHABLE_KEY)).toMatchObject({ 'cache.result': 'error' });

    const scraped = await scrape();
    for (const result of ['hit', 'stale', 'miss', 'error']) {
      expect(scraped).toContain(
        `cache_lookups_total{result="${result}",otel_scope_name="nextjs-redis-cache"} 1`,
      );
    }
    expect(scraped).toContain(
      'cache_entry_size_bytes_count{otel_scope_name="nextjs-redis-cache"} 2',
    );
  });

  it('serves an unreachable Redis as a miss', async () => {
    const cache = new Orchestrator();
    await expect(cache.get(UNREACHABLE_KEY)).resolves.toBeUndefined();
  });
});
