import build from '@/build';
import { diag, DiagConsoleLogger, type DiagLogger, DiagLogLevel } from '@opentelemetry/api';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HostMetrics } from '@opentelemetry/host-metrics';
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb';
import type { SerializerPayload } from '@opentelemetry/instrumentation-mongoose';
import { MongooseInstrumentation } from '@opentelemetry/instrumentation-mongoose';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  AlwaysOnSampler,
  BatchSpanProcessor,
  ParentBasedSampler,
} from '@opentelemetry/sdk-trace-base';
import { PrismaInstrumentation } from '@prisma/instrumentation';

// Environment variables with fallbacks
const TRACE_URL =
  // eslint-disable-next-line n/no-process-env
  process.env['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'] ?? 'http://tempo:4318/v1/traces';
// eslint-disable-next-line n/no-process-env
const LOG_URL = process.env['OTEL_EXPORTER_OTLP_LOGS_ENDPOINT'] ?? 'http://loki:3100/otlp/v1/logs';
// eslint-disable-next-line n/no-process-env
const METRICS_PORT = Number.parseInt(process.env['OTEL_EXPORTER_PROMETHEUS_PORT'] ?? '9464', 10);

const traceExporter = new OTLPTraceExporter({
  url: TRACE_URL,
  concurrencyLimit: 10,
  timeoutMillis: 5000,
});

const logExporter = new OTLPLogExporter({
  url: LOG_URL,
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

class IgnoreTempoErrorLogger implements DiagLogger {
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
    // Suppress tempo and localhost/127.0.0.1 OTLP connection errors
    if (
      message.includes('getaddrinfo ENOTFOUND tempo') ||
      message.includes('ECONNREFUSED tempo') ||
      message.includes('ECONNREFUSED 127.0.0.1:4318') ||
      message.includes('ECONNREFUSED localhost:4318')
    ) {
      return true;
    }

    // Suppress clock skew warnings from MongoDB instrumentation
    // This is a known issue: https://github.com/open-telemetry/opentelemetry-js/issues/4363
    if (message.includes('Inconsistent start and end time')) {
      return true;
    }

    // Suppress "operation on ended span" warnings - happens when async callbacks
    // try to modify a span after it's ended (timing race in instrumentation)
    if (
      message.includes('Operation attempted on ended Span') ||
      message.includes('Cannot execute the operation on ended Span')
    ) {
      return true;
    }

    return args.some((argument) => this.checkArgument(argument));
  }

  private checkArgument(argument: unknown): boolean {
    if (!argument) return false;

    if (typeof argument === 'string') {
      return (
        argument.includes('getaddrinfo ENOTFOUND tempo') ||
        argument.includes('ECONNREFUSED tempo') ||
        argument.includes('ECONNREFUSED 127.0.0.1:4318') ||
        argument.includes('ECONNREFUSED localhost:4318')
      );
    }

    if (argument instanceof Error) {
      return (
        argument.message.includes('getaddrinfo ENOTFOUND tempo') ||
        argument.message.includes('ECONNREFUSED tempo') ||
        argument.message.includes('ECONNREFUSED 127.0.0.1:4318') ||
        argument.message.includes('ECONNREFUSED localhost:4318')
      );
    }

    if (typeof argument === 'object') {
      const record = argument as Record<string, unknown>;
      return (
        (record['code'] === 'ENOTFOUND' && record['hostname'] === 'tempo') ||
        (record['code'] === 'ECONNREFUSED' && record['address'] === 'tempo') ||
        (record['code'] === 'ECONNREFUSED' &&
          record['address'] === '127.0.0.1' &&
          record['port'] === 4318) ||
        (typeof record['message'] === 'string' &&
          (record['message'].includes('tempo') ||
            record['message'].includes('127.0.0.1:4318') ||
            record['message'].includes('localhost:4318')))
      );
    }

    return false;
  }
}

// For troubleshooting, set the log level to DiagLogLevel.DEBUG
diag.setLogger(new IgnoreTempoErrorLogger(), DiagLogLevel.WARN);

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

export const sdk = new NodeSDK({
  traceExporter,
  metricReader: metricsReader,
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
    version: build.version,
    commitHash: build.git.hash,
    branch: build.git.branch,
  }),
  serviceName: 'conveniat27-app',
  sampler: new ParentBasedSampler({
    root: new AlwaysOnSampler(),
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
  ],
});

// Initialize Host Metrics
// Relies on the global MeterProvider registered by NodeSDK
export const hostMetrics = new HostMetrics({ name: 'host-metrics' });
