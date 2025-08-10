import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import type { SpanProcessor } from '@opentelemetry/sdk-trace-base';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { PrismaInstrumentation } from '@prisma/instrumentation';

const exporter = new OTLPTraceExporter({
  url: 'http://tempo:4318/v1/traces',
  concurrencyLimit: 10, // an optional limit on pending requests
  timeoutMillis: 10_000,
});

const spanProcessors: SpanProcessor[] = [
  new BatchSpanProcessor(exporter, {
    exportTimeoutMillis: 20_000,
    maxQueueSize: 512,
    scheduledDelayMillis: 5000,
    maxExportBatchSize: 512,
  }),
];

const sdk = new NodeSDK({
  traceExporter: exporter,

  spanProcessors: spanProcessors,
  serviceName: 'conveniat27',

  autoDetectResources: true,

  instrumentations: [
    new HttpInstrumentation(),
    new FetchInstrumentation(),
    new PrismaInstrumentation(),
  ],
});

// start sdk
sdk.start();
export default sdk;
