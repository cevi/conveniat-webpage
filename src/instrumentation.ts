import build from '@/build';

import type { Configuration } from '@vercel/otel';

export function register(): void {
  console.log(
    `Registering OpenTelemetry instrumentation for ${build.version} (${build.git.hash}) on branch ${build.git.branch}`,
  );

  // here we cannot use `environmentVariables` because that's only available in the node runtime
  // eslint-disable-next-line n/no-process-env
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    const instantiateOTLP = async (): Promise<void> => {
      // we cannot import these packages at the top level
      // because they are only available in the node runtime
      const { FetchInstrumentation, OTLPHttpJsonTraceExporter, registerOTel } = await import(
        '@vercel/otel'
      );
      const { OTLPLogExporter } = await import('@opentelemetry/exporter-logs-otlp-http');
      const { logs } = await import('@opentelemetry/sdk-node');
      const { PrismaInstrumentation } = await import('@prisma/instrumentation');

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

      const logRecordProcessor = new logs.BatchLogRecordProcessor(
        new OTLPLogExporter({ url: 'http://loki:3100' }),
      );

      registerOTel({ ...baseOTELConfig, logRecordProcessor });
    };

    instantiateOTLP()
      .then(() => {
        console.log('OTLP instrumentation registered successfully.');
      })
      .catch((error: unknown) => {
        console.error('Failed to load OTLPLogExporter:', error);
      });
  }
}
