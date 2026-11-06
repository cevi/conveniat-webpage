import type { TracerProvider } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

import { bindInstrumentationsToProvider } from '@/lib/bind-instrumentations';

/** The hook the Prisma client calls for every span it opens; its shape is Prisma's own. */
interface PrismaTracingHelper {
  runInChildSpan<T>(options: { name: string }, callback: () => T): T;
}

const prismaHelper = (): PrismaTracingHelper | undefined =>
  (globalThis as { V7_PRISMA_INSTRUMENTATION?: { helper?: PrismaTracingHelper } })
    .V7_PRISMA_INSTRUMENTATION?.helper;

interface PrismaInstrumentationLike {
  readonly instrumentationName: string;
  setTracerProvider(provider: TracerProvider): void;
  enable(): void;
  disable(): void;
}

describe('bindInstrumentationsToProvider', () => {
  it("lets the Prisma client's spans reach the SDK it was not enabled with", async () => {
    // The state read from the running Next.js server: the instrumentation was enabled with the
    // proxy of another copy of `@opentelemetry/api`, before the SDK registered its provider,
    // and that proxy never got one. An isolated module registry is that other copy.
    let instrumentation: PrismaInstrumentationLike | undefined;
    await jest.isolateModulesAsync(async () => {
      const { trace } = await import('@opentelemetry/api');
      const { createPrismaInstrumentation } = await import('@/lib/prisma-instrumentation');
      instrumentation = createPrismaInstrumentation();
      instrumentation.setTracerProvider(trace.getTracerProvider());
      instrumentation.enable();
    });

    const exporter = new InMemorySpanExporter();
    const sdk = new NodeSDK({
      spanProcessors: [new SimpleSpanProcessor(exporter)],
      autoDetectResources: false,
    });
    sdk.start();

    prismaHelper()?.runInChildSpan({ name: 'operation' }, () => 'before');
    expect(exporter.getFinishedSpans()).toHaveLength(0);

    bindInstrumentationsToProvider(instrumentation ? [instrumentation] : []);
    prismaHelper()?.runInChildSpan({ name: 'operation' }, () => 'after');

    // before shutdown, which empties the in-memory exporter
    expect(exporter.getFinishedSpans().map((span) => span.name)).toStrictEqual([
      'prisma:client:operation',
    ]);
    await sdk.shutdown();
  });
});
