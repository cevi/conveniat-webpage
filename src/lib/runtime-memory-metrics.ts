import { metrics, ValueType } from '@opentelemetry/api';
import v8 from 'node:v8';

/**
 * Node runtime memory instruments.
 *
 * These exist because the deployments grow by roughly 190 MB a day and nothing in the
 * telemetry could say what was growing. The container limit is 2 GiB, and Node sizes the V8
 * heap from that cgroup limit, which leaves a heap ceiling of about 1120 MB. A container at
 * 1.6 GB therefore holds at least 500 MB that the JavaScript heap cannot account for, and the
 * kernel kills it while V8 still believes it has room — which is why the restarts never left a
 * `JavaScript heap out of memory` behind to read.
 *
 * Telling those two cases apart needs `rss` and the heap numbers from the same snapshot:
 * `rss - heap_total - external` is the native memory that no JavaScript heap snapshot will
 * ever show. That is what the batch callback below is for; observing the gauges separately
 * would mix readings from different moments and make the subtraction meaningless.
 *
 * Exported through the Prometheus exporter in `src/tracing.ts` (`:9464`), scraped per replica.
 * No attributes, so this is six series per replica and cannot grow.
 *
 * Units are carried by the metric names rather than the `unit` field, matching
 * `@/lib/chat-realtime-metrics`: exporters may append a unit suffix, and a name that shifts
 * under us silently breaks the dashboard panels built on it.
 */

let registered = false;

/**
 * Registers the Node runtime memory gauges on the global MeterProvider.
 *
 * Must be called after `sdk.start()`. `metrics.getMeter()` resolves the global provider at the
 * moment it is called and the metrics API keeps no proxy for a provider that is not registered
 * yet, so a meter taken earlier stays a no-op for the life of the process.
 */
export const registerRuntimeMemoryMetrics = (): void => {
  if (registered) return;
  registered = true;

  const meter = metrics.getMeter('runtime-memory');

  const gauge = (
    name: string,
    description: string,
  ): ReturnType<typeof meter.createObservableGauge> =>
    meter.createObservableGauge(name, { description, valueType: ValueType.INT });

  const rss = gauge(
    'nodejs_memory_rss_bytes',
    'Resident set size of the Node process, the number the container limit is enforced against',
  );
  const heapTotal = gauge(
    'nodejs_memory_heap_total_bytes',
    'V8 heap currently reserved from the OS',
  );
  const heapUsed = gauge('nodejs_memory_heap_used_bytes', 'Live objects on the V8 heap');
  const heapLimit = gauge(
    'nodejs_memory_heap_limit_bytes',
    'Ceiling V8 will grow the heap to, derived from the cgroup memory limit',
  );
  const external = gauge(
    'nodejs_memory_external_bytes',
    'Memory held by C++ objects bound to JavaScript values, outside the V8 heap',
  );
  const arrayBuffers = gauge(
    'nodejs_memory_array_buffers_bytes',
    'Memory held by ArrayBuffers and Buffers, included in the external total',
  );

  meter.addBatchObservableCallback(
    (observer) => {
      const usage = process.memoryUsage();
      observer.observe(rss, usage.rss);
      observer.observe(heapTotal, usage.heapTotal);
      observer.observe(heapUsed, usage.heapUsed);
      observer.observe(external, usage.external);
      observer.observe(arrayBuffers, usage.arrayBuffers);
      observer.observe(heapLimit, v8.getHeapStatistics().heap_size_limit);
    },
    [rss, heapTotal, heapUsed, heapLimit, external, arrayBuffers],
  );
};
