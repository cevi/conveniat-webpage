import { SeededIdGenerator } from '@/lib/trace-id-generator';
import type {
  WorkAsyncStorage,
  WorkStore,
} from 'next/dist/server/app-render/work-async-storage.external';
import type {
  WorkUnitAsyncStorage,
  WorkUnitStore,
} from 'next/dist/server/app-render/work-unit-async-storage.external';
import { AsyncLocalStorage } from 'node:async_hooks';

let workAsyncStorage: WorkAsyncStorage;
let workUnitAsyncStorage: WorkUnitAsyncStorage;

beforeAll(async () => {
  // The Next.js server sets this global before it loads anything that renders.
  Object.assign(globalThis, { AsyncLocalStorage });

  ({ workAsyncStorage } = await import('next/dist/server/app-render/work-async-storage.external'));
  ({ workUnitAsyncStorage } =
    await import('next/dist/server/app-render/work-unit-async-storage.external'));
  // Installs the guards Next.js puts on `Math.random()` and `crypto.getRandomValues()`.
  await import('next/dist/server/node-environment-extensions/random');
  await import('next/dist/server/node-environment-extensions/web-crypto');
});

/**
 * Runs `callback` the way Next.js runs a component during a prerender, and returns the
 * signal the prerender is aborted through when the callback reads an unstable value.
 */
const insidePrerender = (callback: () => void): AbortSignal => {
  const controller = new AbortController();
  // Only the fields the guard reads.
  const workStore = { route: '/[...not-found]' } as WorkStore;
  const workUnitStore = { type: 'prerender', controller } as unknown as WorkUnitStore;

  workAsyncStorage.run(workStore, () => {
    workUnitAsyncStorage.run(workUnitStore, callback);
  });

  return controller.signal;
};

describe('SeededIdGenerator', () => {
  it('generates ids during a prerender without aborting it', () => {
    const generator = new SeededIdGenerator();

    const signal = insidePrerender(() => {
      generator.generateTraceId();
      generator.generateSpanId();
    });

    expect(signal.aborted).toBe(false);
  });

  it('is checked against the guard that aborts on crypto.getRandomValues()', () => {
    const signal = insidePrerender(() => {
      crypto.getRandomValues(new Uint8Array(8));
    });

    expect(signal.aborted).toBe(true);
  });

  it('generates W3C-shaped trace and span ids', () => {
    const generator = new SeededIdGenerator();

    expect(generator.generateTraceId()).toMatch(/^[\da-f]{32}$/);
    expect(generator.generateSpanId()).toMatch(/^[\da-f]{16}$/);
  });

  it('does not repeat ids, within one generator or across processes', () => {
    const first = new SeededIdGenerator();
    const second = new SeededIdGenerator();

    const ids = new Set<string>();
    for (let index = 0; index < 10_000; index++) {
      ids.add(first.generateTraceId());
      ids.add(second.generateTraceId());
    }

    expect(ids.size).toBe(20_000);
  });
});
