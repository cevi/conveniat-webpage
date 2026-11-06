import { PrismaInstrumentation } from '@prisma/instrumentation';

/**
 * Spans for every Prisma query and transaction, so a trace shows the database time of a
 * request, and which calls ran while a transaction was open (#774).
 *
 * Created disabled, so it does not enable itself in its constructor while `src/tracing.ts` is
 * still being evaluated. `PrismaInstrumentation` does not patch a module: `enable()` puts a
 * helper on `globalThis` that the Prisma client asks on every query, and the helper keeps the
 * tracer provider it has at that moment. In the Next.js server that is not yet the SDK's, so
 * `bindInstrumentationsToProvider` enables it again after `sdk.start()` with the registered
 * one. Without that the client reports tracing as on and every span goes nowhere.
 *
 * `serialize` and `connect` are left out: they say nothing a trace needs, and each query would
 * otherwise bring four spans. `db_query` carries the SQL with placeholders, never the values.
 */
export const createPrismaInstrumentation = (): PrismaInstrumentation =>
  new PrismaInstrumentation({
    enabled: false,
    ignoreSpanTypes: ['prisma:client:serialize', 'prisma:client:connect'],
  });
