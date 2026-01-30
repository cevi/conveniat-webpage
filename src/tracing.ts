import build from '@/build';
import { diag, DiagConsoleLogger, type DiagLogger, DiagLogLevel } from '@opentelemetry/api';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HostMetrics } from '@opentelemetry/host-metrics';
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb';
import type {
  SerializerPayload} from '@opentelemetry/instrumentation-mongoose';
import {
  MongooseInstrumentation
} from '@opentelemetry/instrumentation-mongoose';
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
    if (message.includes('getaddrinfo ENOTFOUND tempo') || message.includes('ECONNREFUSED tempo')) {
      return true;
    }

    return args.some((argument) => this.checkArgument(argument));
  }

  private checkArgument(argument: unknown): boolean {
    if (!argument) return false;

    if (typeof argument === 'string') {
      return (
        argument.includes('getaddrinfo ENOTFOUND tempo') || argument.includes('ECONNREFUSED tempo')
      );
    }

    if (argument instanceof Error) {
      return (
        argument.message.includes('getaddrinfo ENOTFOUND tempo') ||
        argument.message.includes('ECONNREFUSED tempo')
      );
    }

    if (typeof argument === 'object') {
      const record = argument as Record<string, unknown>;
      return (
        (record['code'] === 'ENOTFOUND' && record['hostname'] === 'tempo') ||
        (record['code'] === 'ECONNREFUSED' && record['address'] === 'tempo') ||
        (typeof record['message'] === 'string' && record['message'].includes('tempo'))
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
          return `${operation} ${JSON.stringify(payload)}`;
        } catch {
          return 'Statement serialization failed';
        }
      },
    }),
    new MongoDBInstrumentation({
      dbStatementSerializer: (command: Record<string, unknown>): string => {
        try {
          return JSON.stringify(command);
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
