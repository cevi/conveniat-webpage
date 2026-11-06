import { NodeSDK } from '@opentelemetry/sdk-node';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

/** The hook the Prisma client calls for every span it opens; its shape is Prisma's own. */
interface PrismaTracingHelper {
  isEnabled(): boolean;
  runInChildSpan<T>(options: { name: string }, callback: () => T): T;
}

const prismaHelper = (): PrismaTracingHelper | undefined =>
  (globalThis as { V7_PRISMA_INSTRUMENTATION?: { helper?: PrismaTracingHelper } })
    .V7_PRISMA_INSTRUMENTATION?.helper;

describe('createPrismaInstrumentation', () => {
  it('exports the spans the Prisma client opens once the SDK has started', async () => {
    // In the app, `@prisma/instrumentation` resolves its own copy of `@opentelemetry/api`, not
    // the one the SDK registers its provider through. An isolated module registry gives it one
    // here too; with a shared copy the bug this covers does not show.
    let instrumentation: unknown;
    await jest.isolateModulesAsync(async () => {
      const { createPrismaInstrumentation } = await import('@/lib/prisma-instrumentation');
      // created before the SDK starts, exactly as src/tracing.ts does
      instrumentation = createPrismaInstrumentation();
    });

    const exporter = new InMemorySpanExporter();
    const sdk = new NodeSDK({
      spanProcessors: [new SimpleSpanProcessor(exporter)],
      instrumentations: [instrumentation as never],
      autoDetectResources: false,
    });
    sdk.start();

    const helper = prismaHelper();
    expect(helper?.isEnabled()).toBe(true);
    helper?.runInChildSpan({ name: 'transaction' }, () => 'committed');
    helper?.runInChildSpan({ name: 'serialize' }, () => 'serialized');

    // before shutdown, which empties the in-memory exporter
    expect(exporter.getFinishedSpans().map((span) => span.name)).toStrictEqual([
      'prisma:client:transaction',
    ]);
    await sdk.shutdown();
  });
});
