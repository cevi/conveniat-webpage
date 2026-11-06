import type { BatchObservableCallback, MeterProvider, Observable } from '@opentelemetry/api';
import { metrics } from '@opentelemetry/api';

const histogram = {
  count: 0,
  max: 0,
  enable: jest.fn(),
  reset: jest.fn(),
  percentile: (percentile: number): number => percentile * 1e6,
};

jest.mock('node:perf_hooks', () => ({
  monitorEventLoopDelay: (): typeof histogram => histogram,
}));

import { registerEventLoopDelayMetrics } from '@/lib/event-loop-metrics';

interface FakeGauge {
  name: string;
}

let batchCallback: BatchObservableCallback | undefined;

metrics.setGlobalMeterProvider({
  getMeter: (): object => ({
    createObservableGauge: (name: string): FakeGauge => ({ name }),
    addBatchObservableCallback: (callback: BatchObservableCallback): void => {
      batchCallback = callback;
    },
  }),
} as unknown as MeterProvider);

const collect = (): Map<string, number> => {
  const observed = new Map<string, number>();
  void batchCallback?.({
    observe: (instrument: Observable, value: number): void => {
      observed.set((instrument as unknown as FakeGauge).name, value);
    },
  });
  return observed;
};

describe('registerEventLoopDelayMetrics', () => {
  registerEventLoopDelayMetrics();

  it('reports nothing before the loop was sampled, rather than a zero that reads healthy', () => {
    histogram.count = 0;

    expect(collect().size).toBe(0);
  });

  it('reports the delays since the last scrape in seconds', () => {
    histogram.count = 120;
    histogram.max = 250e6;
    histogram.reset.mockClear();

    expect(collect()).toStrictEqual(
      new Map([
        ['nodejs_eventloop_delay_p50_seconds', 0.05],
        ['nodejs_eventloop_delay_p99_seconds', 0.099],
        ['nodejs_eventloop_delay_max_seconds', 0.25],
      ]),
    );
    expect(histogram.reset).toHaveBeenCalledTimes(1);
  });
});
