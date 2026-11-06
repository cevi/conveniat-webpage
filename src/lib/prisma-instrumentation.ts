import { PrismaInstrumentation } from '@prisma/instrumentation';

/**
 * Spans for every Prisma query and transaction, so a trace shows the database time of a
 * request, and which calls ran while a transaction was open (#774).
 *
 * Created disabled on purpose. `PrismaInstrumentation` does not patch a module: on `enable()`
 * it puts a helper on `globalThis` that the Prisma client asks on every query, and the helper
 * keeps the tracer provider it was given at that moment. Created enabled, it enabled itself in
 * its constructor, while `src/tracing.ts` was still being evaluated and before `sdk.start()`
 * had registered a provider, so it held the no-op one: the client reported tracing as on and
 * every span went nowhere. Created disabled, the SDK enables it in `start()`, after setting
 * the real provider.
 *
 * `serialize` and `connect` are left out: they say nothing a trace needs, and each query would
 * otherwise bring four spans. `db_query` carries the SQL with placeholders, never the values.
 */
export const createPrismaInstrumentation = (): PrismaInstrumentation =>
  new PrismaInstrumentation({
    enabled: false,
    ignoreSpanTypes: ['prisma:client:serialize', 'prisma:client:connect'],
  });
