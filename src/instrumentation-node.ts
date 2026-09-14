import build from '@/build';
import { initHttpClient } from '@/lib/http-client';
import { sdk, startRuntimeMetrics } from '@/tracing';
import { installConsoleOtelBridge } from '@/utils/otel-console-bridge';

/**
 * Starts the Node-runtime side of the observability stack.
 *
 * Lives in its own module rather than in `src/instrumentation.ts` because Next.js compiles that
 * file for the Edge runtime as well as for Node, and every import here is Node-only: `undici`,
 * `node:util`, the `NodeSDK`, and `node:v8` by way of `@/lib/runtime-memory-metrics`. Imported
 * at module scope, they made the Edge instrumentation bundle fail to compile. `src/proxy.ts`
 * runs on that bundle, so the failure is not cosmetic.
 */
export const registerNodeInstrumentation = (): void => {
  // initialize the global HTTP client
  initHttpClient();

  // start the SDK
  console.log(
    `Starting OpenTelemetry SDK for ${build.version} (${build.git.hash}) on branch ${build.git.branch}`,
  );

  sdk.start();

  // Must come after sdk.start(): the instruments bind to the global MeterProvider at the
  // moment they are created, and the metrics API has no proxy for one that is not registered
  // yet, so anything built earlier stays a no-op.
  startRuntimeMetrics();

  // Must come after sdk.start(): before the SDK registers a LoggerProvider the
  // logs API hands back a no-op logger, so anything captured earlier is dropped.
  installConsoleOtelBridge();
};
