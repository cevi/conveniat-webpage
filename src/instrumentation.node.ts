import build from '@/build';

import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { logs } from '@opentelemetry/sdk-node';
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import type { Configuration } from '@vercel/otel';
import { FetchInstrumentation, OTLPHttpJsonTraceExporter, registerOTel } from '@vercel/otel';

const instantiateOTLP = async (): Promise<void> => {
  // we cannot import these packages at the top level
  // because they are only available in the node runtime
  const baseOTELConfig: Configuration = {
    serviceName: 'conveniat27-app',
    traceExporter: new OTLPHttpJsonTraceExporter({
      url: 'http://tempo:4318/v1/traces',
    }),
    attributes: {
      version: build.version,
      commitHash: build.git.hash,
      branch: build.git.branch,
    },
    instrumentations: [
      new FetchInstrumentation({ enabled: true }),
      new PrismaInstrumentation({ enabled: true }),
      new HttpInstrumentation({ enabled: true }),
    ],

    // 25% of traces will be sampled
    traceSampler: new TraceIdRatioBasedSampler(0.25),
  };

  const logRecordProcessor = new logs.BatchLogRecordProcessor(
    new OTLPLogExporter({ url: 'http://loki:3100' }),
  );

  registerOTel({ ...baseOTELConfig, logRecordProcessor });
};

instantiateOTLP()
  .then(() => {
    console.log('OTLP instrumentation registered successfully.');
  })
  // eslint-disable-next-line unicorn/prefer-top-level-await
  .catch((error: unknown) => {
    console.error('Failed to load OTLPLogExporter:', error);
  });
