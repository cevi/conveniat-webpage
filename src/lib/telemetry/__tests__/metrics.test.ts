import {
  bindPendingGauges,
  defineCounter,
  defineHistogram,
  defineObservableGauges,
} from '@/lib/telemetry/metrics';
import { metrics } from '@opentelemetry/api';
import { PrometheusExporter, PrometheusSerializer } from '@opentelemetry/exporter-prometheus';
import { metrics as sdkMetrics } from '@opentelemetry/sdk-node';

/** Registers a real MeterProvider and returns what Prometheus would scrape from it. */
const startSdk = (): (() => Promise<string>) => {
  const exporter = new PrometheusExporter({ preventServerStart: true });
  metrics.setGlobalMeterProvider(new sdkMetrics.MeterProvider({ readers: [exporter] }));

  return async (): Promise<string> => {
    const { resourceMetrics } = await exporter.collect();
    return new PrometheusSerializer().serialize(resourceMetrics);
  };
};

afterEach(() => {
  metrics.disable();
});

describe('defineCounter', () => {
  it('drops samples taken before the SDK started instead of binding to the no-op provider', async () => {
    const counter = defineCounter<{ outcome: 'ok' }>({
      scope: 'test',
      name: 'test_early_total',
      description: 'Counted before and after the SDK started',
    });

    counter.add(5, { outcome: 'ok' });
    const scrape = startSdk();
    counter.add(1, { outcome: 'ok' });

    expect(await scrape()).toContain('test_early_total{outcome="ok",otel_scope_name="test"} 1');
  });

  it('is scraped under the name it was defined with', async () => {
    const scrape = startSdk();
    defineCounter({ scope: 'test', name: 'test_sends_total', description: 'Sends' }).add(2);

    const scraped = await scrape();

    expect(scraped).toContain('test_sends_total{otel_scope_name="test"} 2');
    expect(scraped).not.toContain('test_sends_total_total');
  });
});

describe('defineHistogram', () => {
  it('uses its own buckets and takes the unit from its name', async () => {
    const scrape = startSdk();
    defineHistogram({
      scope: 'test',
      name: 'test_duration_seconds',
      description: 'A duration',
      buckets: [0.1, 1],
    }).record(0.5);

    const scraped = await scrape();

    expect(scraped).toContain('# UNIT test_duration_seconds s');
    expect(scraped).toContain('test_duration_seconds_bucket{otel_scope_name="test",le="0.1"} 0');
    expect(scraped).toContain('test_duration_seconds_bucket{otel_scope_name="test",le="1"} 1');
  });
});

describe('defineObservableGauges', () => {
  it('reports gauges defined before the SDK started once the pending ones are bound', async () => {
    defineObservableGauges({
      scope: 'test',
      gauges: {
        queued: { name: 'test_queued', description: 'Queued items', valueType: 'int' },
        oldest: { name: 'test_oldest_seconds', description: 'Oldest item', valueType: 'double' },
      },
      observe: (observe): void => {
        observe('queued', 3, { state: 'due' });
        observe('oldest', 1.5);
      },
    });

    const scrape = startSdk();
    expect(await scrape()).not.toContain('test_queued');

    bindPendingGauges();
    const scraped = await scrape();

    expect(scraped).toContain('test_queued{state="due",otel_scope_name="test"} 3');
    expect(scraped).toContain('test_oldest_seconds{otel_scope_name="test"} 1.5');
  });

  it('registers right away when the SDK is already running', async () => {
    const scrape = startSdk();
    defineObservableGauges({
      scope: 'test',
      gauges: { open: { name: 'test_open', description: 'Open things', valueType: 'int' } },
      observe: (observe): void => {
        observe('open', 7);
      },
    });

    expect(await scrape()).toContain('test_open{otel_scope_name="test"} 7');
  });
});
