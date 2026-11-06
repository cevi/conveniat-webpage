import { metrics, ValueType } from '@opentelemetry/api';
import { monitorEventLoopDelay } from 'node:perf_hooks';

/**
 * Event loop delay gauges, the saturation signal of a Node process.
 *
 * Heap and CPU say how much a replica holds and burns, not whether it still answers: a
 * replica stuck in a long synchronous render, a big JSON parse or a Hof sync looping over
 * pages answers every other request late, and the latency it adds shows up in every route at
 * once. The p99 of how late a timer fires is the number that tells this apart from one slow
 * route.
 *
 * Read from `perf_hooks.monitorEventLoopDelay`, which samples every 20 ms. The histogram is
 * reset after each collection, so each scrape reports the delays since the previous one
 * rather than since the process started; a spike of an hour ago does not stay in the p99.
 *
 * Exported through the Prometheus exporter in `src/tracing.ts` (`:9464`). No attributes, so
 * three series per replica. Units are in the names, as in `@/lib/runtime-memory-metrics`.
 */

/** How often the monitor samples the loop, in milliseconds. */
const RESOLUTION_MS = 20;

const NANOSECONDS_PER_SECOND = 1e9;

let registered = false;

/**
 * Registers the event loop delay gauges on the global MeterProvider.
 *
 * Must be called after `sdk.start()`, see `registerRuntimeMemoryMetrics`.
 */
export const registerEventLoopDelayMetrics = (): void => {
  if (registered) return;
  registered = true;

  const histogram = monitorEventLoopDelay({ resolution: RESOLUTION_MS });
  histogram.enable();

  const meter = metrics.getMeter('runtime-event-loop');
  const gauge = (
    name: string,
    description: string,
  ): ReturnType<typeof meter.createObservableGauge> =>
    meter.createObservableGauge(name, { description, valueType: ValueType.DOUBLE });

  const p50 = gauge(
    'nodejs_eventloop_delay_p50_seconds',
    'Median delay of the event loop since the last scrape, in seconds',
  );
  const p99 = gauge(
    'nodejs_eventloop_delay_p99_seconds',
    'p99 delay of the event loop since the last scrape, in seconds',
  );
  const max = gauge(
    'nodejs_eventloop_delay_max_seconds',
    'Longest delay of the event loop since the last scrape, in seconds',
  );

  meter.addBatchObservableCallback(
    (observer) => {
      // no sample yet, as right after start: report nothing rather than a zero that reads healthy
      if (histogram.count === 0) return;
      observer.observe(p50, histogram.percentile(50) / NANOSECONDS_PER_SECOND);
      observer.observe(p99, histogram.percentile(99) / NANOSECONDS_PER_SECOND);
      observer.observe(max, histogram.max / NANOSECONDS_PER_SECOND);
      histogram.reset();
    },
    [p50, p99, max],
  );
};
