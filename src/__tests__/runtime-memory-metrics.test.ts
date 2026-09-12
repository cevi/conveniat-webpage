import { registerRuntimeMemoryMetrics } from '@/lib/runtime-memory-metrics';
import type { BatchObservableCallback, MeterProvider, Observable } from '@opentelemetry/api';
import { metrics } from '@opentelemetry/api';

/**
 * The bug these cover: the instruments used to be created while `src/tracing.ts` was still
 * being evaluated, which is before `register()` calls `sdk.start()`. `metrics.getMeter()`
 * resolves the global MeterProvider at the moment it is called and the metrics API keeps no
 * proxy for one that is not registered yet, so those instruments bound to the no-op provider
 * and never reported a single value. Registering after the provider is in place is the whole
 * fix, so that is what is asserted here.
 */

interface FakeGauge {
  name: string;
}

const gaugeNames: string[] = [];
let batchCallback: BatchObservableCallback | undefined;

const meter = {
  createObservableGauge: (name: string): FakeGauge => {
    gaugeNames.push(name);
    return { name };
  },
  addBatchObservableCallback: (callback: BatchObservableCallback): void => {
    batchCallback = callback;
  },
};

afterEach(() => {
  metrics.disable();
});

describe('registerRuntimeMemoryMetrics', () => {
  it('reports memory through the provider registered after this module was imported', () => {
    const requestedMeters: string[] = [];
    const getMeter = jest.fn((name: string) => {
      requestedMeters.push(name);
      return meter;
    });
    metrics.setGlobalMeterProvider({ getMeter } as unknown as MeterProvider);

    registerRuntimeMemoryMetrics();

    expect(requestedMeters).toStrictEqual(['runtime-memory']);
    expect(gaugeNames).toStrictEqual([
      'nodejs_memory_rss_bytes',
      'nodejs_memory_heap_total_bytes',
      'nodejs_memory_heap_used_bytes',
      'nodejs_memory_heap_limit_bytes',
      'nodejs_memory_external_bytes',
      'nodejs_memory_array_buffers_bytes',
    ]);

    // Resident size and the heap numbers have to come from one snapshot, because
    // `rss - heap_total - external` is the native memory the issue is actually about.
    const observed = new Map<string, number>();
    void batchCallback?.({
      observe: (instrument: Observable, value: number): void => {
        observed.set((instrument as unknown as FakeGauge).name, value);
      },
    });

    expect(observed.size).toBe(6);
    for (const [name, value] of observed) {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
      expect(Number.isFinite(value)).toBe(true);
      expect(name.endsWith('_bytes')).toBe(true);
    }
    expect(observed.get('nodejs_memory_heap_used_bytes')).toBeLessThanOrEqual(
      observed.get('nodejs_memory_heap_limit_bytes') ?? 0,
    );
  });
});
