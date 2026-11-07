import { defineObservableGauges } from '@/lib/telemetry/metrics';
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
 * three series per replica.
 */

/** How often the monitor samples the loop, in milliseconds. */
const RESOLUTION_MS = 20;

const NANOSECONDS_PER_SECOND = 1e9;

let registered = false;

/**
 * Registers the event loop delay gauges. Later calls do nothing.
 */
export const registerEventLoopDelayMetrics = (): void => {
  if (registered) return;
  registered = true;

  const histogram = monitorEventLoopDelay({ resolution: RESOLUTION_MS });
  histogram.enable();

  defineObservableGauges({
    scope: 'runtime-event-loop',
    gauges: {
      p50: {
        name: 'nodejs_eventloop_delay_p50_seconds',
        description: 'Median delay of the event loop since the last scrape, in seconds',
        valueType: 'double',
      },
      p99: {
        name: 'nodejs_eventloop_delay_p99_seconds',
        description: 'p99 delay of the event loop since the last scrape, in seconds',
        valueType: 'double',
      },
      max: {
        name: 'nodejs_eventloop_delay_max_seconds',
        description: 'Longest delay of the event loop since the last scrape, in seconds',
        valueType: 'double',
      },
    },
    observe: (observe): void => {
      // no sample yet, as right after start: report nothing rather than a zero that reads healthy
      if (histogram.count === 0) return;
      observe('p50', histogram.percentile(50) / NANOSECONDS_PER_SECOND);
      observe('p99', histogram.percentile(99) / NANOSECONDS_PER_SECOND);
      observe('max', histogram.max / NANOSECONDS_PER_SECOND);
      histogram.reset();
    },
  });
};
