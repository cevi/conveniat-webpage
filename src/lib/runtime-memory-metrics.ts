import { defineObservableGauges } from '@/lib/telemetry/metrics';
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
 */

let registered = false;

/**
 * Registers the Node runtime memory gauges. Later calls do nothing.
 */
export const registerRuntimeMemoryMetrics = (): void => {
  if (registered) return;
  registered = true;

  defineObservableGauges({
    scope: 'runtime-memory',
    gauges: {
      rss: {
        name: 'nodejs_memory_rss_bytes',
        description:
          'Resident set size of the Node process, the number the container limit is enforced against',
        valueType: 'int',
      },
      heapTotal: {
        name: 'nodejs_memory_heap_total_bytes',
        description: 'V8 heap currently reserved from the OS',
        valueType: 'int',
      },
      heapUsed: {
        name: 'nodejs_memory_heap_used_bytes',
        description: 'Live objects on the V8 heap',
        valueType: 'int',
      },
      heapLimit: {
        name: 'nodejs_memory_heap_limit_bytes',
        description: 'Ceiling V8 will grow the heap to, derived from the cgroup memory limit',
        valueType: 'int',
      },
      external: {
        name: 'nodejs_memory_external_bytes',
        description: 'Memory held by C++ objects bound to JavaScript values, outside the V8 heap',
        valueType: 'int',
      },
      arrayBuffers: {
        name: 'nodejs_memory_array_buffers_bytes',
        description: 'Memory held by ArrayBuffers and Buffers, included in the external total',
        valueType: 'int',
      },
    },
    observe: (observe): void => {
      const usage = process.memoryUsage();
      observe('rss', usage.rss);
      observe('heapTotal', usage.heapTotal);
      observe('heapUsed', usage.heapUsed);
      observe('external', usage.external);
      observe('arrayBuffers', usage.arrayBuffers);
      observe('heapLimit', v8.getHeapStatistics().heap_size_limit);
    },
  });
};
