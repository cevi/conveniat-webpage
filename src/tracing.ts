import build from '@/build';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HostMetrics } from '@opentelemetry/host-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { FetchInstrumentation } from '@vercel/otel';

// Environment variables with fallbacks
const TRACE_URL =
  // eslint-disable-next-line n/no-process-env
  process.env['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'] || 'http://tempo:4318/v1/traces';
// eslint-disable-next-line n/no-process-env
const LOG_URL = process.env['OTEL_EXPORTER_OTLP_LOGS_ENDPOINT'] || 'http://loki:3100/otlp/v1/logs';
// eslint-disable-next-line n/no-process-env
const METRICS_PORT = Number.parseInt(process.env['OTEL_EXPORTER_PROMETHEUS_PORT'] || '9464', 10);

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

// For troubleshooting, set the log level to DiagLogLevel.DEBUG
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

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
  logRecordProcessor: new BatchLogRecordProcessor(logExporter, {
    exportTimeoutMillis: 5000,
    maxQueueSize: 2048,
    scheduledDelayMillis: 5000,
    maxExportBatchSize: 512,
  }),
  resource: resourceFromAttributes({
    version: build.version,
    commitHash: build.git.hash,
    branch: build.git.branch,
  }),
  serviceName: 'conveniat27-app',
  sampler: new TraceIdRatioBasedSampler(0.25),
  autoDetectResources: false,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-mongoose': { enabled: true },
      '@opentelemetry/instrumentation-http': { enabled: true }, // Re-enabled for RED metrics
      '@opentelemetry/instrumentation-mongodb': {
        dbStatementSerializer: (command: Record<string, unknown>) => {
          try {
            return JSON.stringify(command);
          } catch {
            return 'Statement serialization failed';
          }
        },
      },
      '@opentelemetry/instrumentation-fs': { enabled: false }, // Reduce noise
    }),
    new PrismaInstrumentation({ enabled: true }),
    new FetchInstrumentation({ enabled: true }),
  ],
});

// Initialize Host Metrics
// Relies on the global MeterProvider registered by NodeSDK
export const hostMetrics = new HostMetrics({ name: 'host-metrics' });
