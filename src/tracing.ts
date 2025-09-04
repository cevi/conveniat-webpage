import build from '@/build';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { MongooseInstrumentation } from '@opentelemetry/instrumentation-mongoose';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { FetchInstrumentation } from '@vercel/otel';

const exporter = new OTLPTraceExporter({
  url: 'http://tempo:4318/v1/traces',
  concurrencyLimit: 10, // an optional limit on pending requests
  timeoutMillis: 10_000,
});

// For troubleshooting, set the log level to DiagLogLevel.DEBUG
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

export const sdk = new NodeSDK({
  traceExporter: exporter,
  spanProcessors: [
    new BatchSpanProcessor(exporter, {
      exportTimeoutMillis: 20_000,
      maxQueueSize: 512,
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
  sampler: new TraceIdRatioBasedSampler(0.25),
  autoDetectResources: true,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-mongoose': { enabled: true },
      '@opentelemetry/instrumentation-http': { enabled: false },
    }),
    new MongooseInstrumentation({ enabled: true }),
    new PrismaInstrumentation({ enabled: true }),
    new FetchInstrumentation({ enabled: true }),
  ],
});
