import build from '@/build';
import { diag, DiagConsoleLogger, type DiagLogger, DiagLogLevel } from '@opentelemetry/api';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HostMetrics } from '@opentelemetry/host-metrics';
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb';
import type { SerializerPayload } from '@opentelemetry/instrumentation-mongoose';
import { MongooseInstrumentation } from '@opentelemetry/instrumentation-mongoose';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  AlwaysOnSampler,
  BatchSpanProcessor,
  type IdGenerator,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base';
import { PrismaInstrumentation } from '@prisma/instrumentation';

/**
 * Custom ID generator that uses `crypto.getRandomValues()` instead of `Math.random()`.
 *
 * Next.js 16's prerender guard intercepts `Math.random()` inside `'use cache'` and
 * ISR/static-generation contexts, causing `NEXT_STATIC_GEN_BAILOUT` errors when
 * OpenTelemetry's default `RandomIdGenerator` creates span/trace IDs via `Math.random()`.
 *
 * `crypto.getRandomValues()` is available in both Node.js and Edge Runtime environments
 * (unlike `node:crypto`) and is not intercepted by the prerender guard.
 *
 * @see https://github.com/vercel/next.js/issues/54751
 */
class CryptoIdGenerator implements IdGenerator {
  generateTraceId(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  generateSpanId(): string {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
}

// Environment variables with fallbacks
const TRACE_URL =
  // eslint-disable-next-line n/no-process-env
  process.env['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'] ?? 'http://tempo:4318/v1/traces';
// eslint-disable-next-line n/no-process-env
const LOG_URL = process.env['OTEL_EXPORTER_OTLP_LOGS_ENDPOINT'] ?? 'http://loki:3100/otlp/v1/logs';
// eslint-disable-next-line n/no-process-env
const METRICS_PORT = Number.parseInt(process.env['OTEL_EXPORTER_PROMETHEUS_PORT'] ?? '9464', 10);

/**
 * Tenant for the shared Loki and Tempo instances.
 *
 * Both run with multi-tenancy enabled, so every write must carry this header —
 * without it the backend rejects the request rather than falling back to a
 * default tenant. Set explicitly rather than via `OTEL_EXPORTER_OTLP_HEADERS`,
 * because the exporters below are constructed with explicit config objects.
 */
// eslint-disable-next-line n/no-process-env
const TENANT_ID = process.env['OTEL_TENANT_ID'] ?? 'default';

const tenantHeaders = { 'X-Scope-OrgID': TENANT_ID };

const traceExporter = new OTLPTraceExporter({
  url: TRACE_URL,
  headers: tenantHeaders,
  concurrencyLimit: 10,
  timeoutMillis: 5000,
});

const logExporter = new OTLPLogExporter({
  url: LOG_URL,
  headers: tenantHeaders,
  concurrencyLimit: 10,
  timeoutMillis: 5000,
});

// Initialize Prometheus Exporter for Pull-based metrics
const metricsReader = new PrometheusExporter(
  {
    port: METRICS_PORT,
    host: '0.0.0.0', // Listen on all interfaces
  },
  () => {
    console.log(`Prometheus metrics exporter started on port ${METRICS_PORT}`);
  },
);

/**
 * Suppresses known-noisy OpenTelemetry diagnostics.
 *
 * This deliberately does NOT suppress connection failures. An earlier version
 * swallowed every message mentioning `tempo`, `4318`, `ECONNREFUSED` or
 * `ENOTFOUND`, which hid the fact that the log pipeline had never successfully
 * delivered a single record to Loki. Export failures must stay visible.
 */
class IgnoreKnownOtelNoiseLogger implements DiagLogger {
  constructor(private readonly logger: DiagLogger = new DiagConsoleLogger()) {}

  error(message: string, ...args: unknown[]): void {
    if (this.shouldIgnore(message, args)) return;
    this.logger.error(message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldIgnore(message, args)) return;
    this.logger.warn(message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldIgnore(message, args)) return;
    this.logger.info(message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldIgnore(message, args)) return;
    this.logger.debug(message, ...args);
  }

  verbose(message: string, ...args: unknown[]): void {
    if (this.shouldIgnore(message, args)) return;
    this.logger.verbose(message, ...args);
  }

  private shouldIgnore(message: string, args: unknown[]): boolean {
    const message_ = typeof message === 'string' ? message : '';

    // Suppress clock skew warnings from MongoDB instrumentation
    // This is a known issue: https://github.com/open-telemetry/opentelemetry-js/issues/4363
    if (message_.includes('Inconsistent start and end time')) {
      return true;
    }

    // Suppress "operation on ended span" warnings - happens when async callbacks
    // try to modify a span after it's ended (timing race in instrumentation)
    if (
      message_.includes('Operation attempted on ended Span') ||
      message_.includes('Cannot execute the operation on ended Span')
    ) {
      return true;
    }

    return args.some((argument) => this.checkArgument(argument));
  }

  private checkArgument(argument: unknown): boolean {
    if (argument === null || argument === undefined) return false;

    const serialized = typeof argument === 'string' ? argument : JSON.stringify(argument);
    return (
      serialized.includes('Inconsistent start and end time') ||
      serialized.includes('Operation attempted on ended Span')
    );
  }
}

// For troubleshooting, set the log level to DiagLogLevel.DEBUG
diag.setLogger(new IgnoreKnownOtelNoiseLogger(), DiagLogLevel.WARN);

// eslint-disable-next-line n/no-process-env
const POSTHOG_HOST = process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://eu.i.posthog.com';
// eslint-disable-next-line n/no-process-env
const POSTHOG_KEY = process.env['NEXT_PUBLIC_POSTHOG_KEY'];

const postHogLogExporter = new OTLPLogExporter({
  url: `${POSTHOG_HOST}/i/v1/logs`,
  headers: {
    Authorization: `Bearer ${POSTHOG_KEY}`,
  },
});

/**
 * Telemetry identity of this deployment.
 *
 * These are read explicitly rather than relying on `OTEL_SERVICE_NAME` and
 * `OTEL_RESOURCE_ATTRIBUTES`: the SDK is configured with
 * `autoDetectResources: false` below, which disables the `envDetector` that
 * would normally pick those up. Setting them via the standard environment
 * variables alone has no effect here.
 */
// eslint-disable-next-line n/no-process-env
const SERVICE_NAME = process.env['OTEL_SERVICE_NAME'] ?? 'conveniat27-app';
// eslint-disable-next-line n/no-process-env
const SERVICE_NAMESPACE = process.env['OTEL_SERVICE_NAMESPACE'] ?? 'conveniat27';
// eslint-disable-next-line n/no-process-env
const DEPLOYMENT_ENVIRONMENT = process.env['DEPLOYMENT_ENV'] ?? 'development';

/**
 * Head sampling ratio, between 0 and 1.
 *
 * Traces were previously always sampled, which produced roughly 900 MB/day of
 * compressed blocks per service. The shared Tempo store has a 4 GB budget, so
 * deployments set this to 0.25 (production) or 0.10 (development). Local
 * development keeps every trace.
 */
const SAMPLING_RATIO = ((): number => {
  // eslint-disable-next-line n/no-process-env
  const raw = process.env['OTEL_TRACES_SAMPLER_ARG'];
  if (raw === undefined) return 1;

  const parsed = Number.parseFloat(raw);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
    console.warn(`Invalid OTEL_TRACES_SAMPLER_ARG "${raw}", falling back to 1.0`);
    return 1;
  }
  return parsed;
})();

export const sdk = new NodeSDK({
  traceExporter,
  metricReaders: [metricsReader],
  idGenerator: new CryptoIdGenerator(),
  spanProcessors: [
    new BatchSpanProcessor(traceExporter, {
      exportTimeoutMillis: 5000,
      maxQueueSize: 2048,
      scheduledDelayMillis: 5000,
      maxExportBatchSize: 512,
    }),
  ],
  logRecordProcessors: [
    new BatchLogRecordProcessor(logExporter, {
      exportTimeoutMillis: 5000,
      maxQueueSize: 2048,
      scheduledDelayMillis: 5000,
      maxExportBatchSize: 512,
    }),
    new BatchLogRecordProcessor(postHogLogExporter, {
      exportTimeoutMillis: 5000,
      maxQueueSize: 2048,
      scheduledDelayMillis: 5000,
      maxExportBatchSize: 512,
    }),
  ],
  resource: resourceFromAttributes({
    'service.namespace': SERVICE_NAMESPACE,
    // Distinguishes conveniat27 production from development, which otherwise
    // report an identical service name into the same shared backend.
    'deployment.environment.name': DEPLOYMENT_ENVIRONMENT,
    version: build.version,
    commitHash: build.git.hash,
    branch: build.git.branch,
  }),
  serviceName: SERVICE_NAME,
  sampler: new ParentBasedSampler({
    root:
      SAMPLING_RATIO >= 1 ? new AlwaysOnSampler() : new TraceIdRatioBasedSampler(SAMPLING_RATIO),
  }),
  autoDetectResources: false,
  instrumentations: [
    new MongooseInstrumentation({
      dbStatementSerializer: (operation: string, payload: SerializerPayload): string => {
        try {
          const payloadString = JSON.stringify(payload);
          return payloadString.length > 500
            ? `${operation} ${payloadString.slice(0, 500)}...`
            : `${operation} ${payloadString}`;
        } catch {
          return 'Statement serialization failed';
        }
      },
    }),
    new MongoDBInstrumentation({
      enhancedDatabaseReporting: true,
      dbStatementSerializer: (command: Record<string, unknown>): string => {
        try {
          const commandString = JSON.stringify(command);
          return commandString.length > 500
            ? `${commandString.slice(0, 500)}...`
            : `${commandString}`;
        } catch {
          return 'Statement serialization failed';
        }
      },
    }),
    new PrismaInstrumentation({ enabled: true }),
    // Bridges Payload's pino logger into the OpenTelemetry log pipeline. Without
    // this nothing in the application ever emits a LogRecord, so the OTLP log
    // exporters above have no input and Loki stays empty.
    //
    // Also stamps trace_id/span_id onto every log line, which is what makes the
    // trace <-> log links in Grafana work.
    new PinoInstrumentation({ disableLogSending: false }),
  ],
});

// Initialize Host Metrics
// Relies on the global MeterProvider registered by NodeSDK
export const hostMetrics = new HostMetrics({ name: 'host-metrics' });
