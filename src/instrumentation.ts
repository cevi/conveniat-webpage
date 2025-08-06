import build from '@/build';
import { logs } from '@opentelemetry/sdk-node';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import type { Configuration } from '@vercel/otel';
import { FetchInstrumentation, OTLPHttpJsonTraceExporter, registerOTel } from '@vercel/otel';

export function register(): void {
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
    ],
  };

  // here we cannot use `environmentVariables` because that's only available in the node runtime
  // eslint-disable-next-line n/no-process-env
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    import('@opentelemetry/exporter-logs-otlp-http')
      .then(({ OTLPLogExporter }) => {
        const logRecordProcessor = new logs.BatchLogRecordProcessor(
          new OTLPLogExporter({
            url: 'http://loki:3100',
          }),
        );

        registerOTel({
          ...baseOTELConfig,
          logRecordProcessor,
        });
      })
      .catch((error: unknown) => {
        console.error('Failed to load OTLPLogExporter:', error);
      });
  } else {
    registerOTel({
      ...baseOTELConfig,
      // No logRecordProcessor for non-Node.js environments, i.e. the middleware runtime
    });
  }
}
