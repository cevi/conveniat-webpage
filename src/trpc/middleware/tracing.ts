import { annotateRequest, appendToRequest } from '@/lib/request-span';
import { defineHistogram } from '@/lib/telemetry/metrics';
import { withSpan } from '@/utils/tracing-helpers';
import { SpanStatusCode } from '@opentelemetry/api';

/**
 * Codes the client is expected to receive and render, rather than symptoms of a broken
 * server. They still get a span and a duration sample, but they must not mark the span as
 * failed: the RED error rate is alerted on, and a form that rejects a bad input or a session
 * that expired is not an outage.
 *
 * `UNAUTHORIZED` is in here for the same reason — an expired session is the normal end of a
 * session, and the client turns it into a sign out.
 */
export const EXPECTED_ERROR_CODES = new Set([
  'BAD_REQUEST',
  'CONFLICT',
  'FORBIDDEN',
  'NOT_FOUND',
  'PRECONDITION_FAILED',
  'TOO_MANY_REQUESTS',
  'UNAUTHORIZED',
  'UNPROCESSABLE_CONTENT',
]);

const durationHistogram = defineHistogram<{
  'trpc.path': string;
  'trpc.type': string;
  'trpc.error_code': string;
}>({
  scope: 'trpc',
  name: 'trpc_procedure_duration_seconds',
  description: 'Wall-clock duration of a tRPC procedure, in seconds',
  // Most procedures are a single indexed Prisma query and land in the low tens of
  // milliseconds, so the resolution sits there; the tail exists to tell "slow" apart from "the
  // user gave up", which matters on camp wifi.
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

/** The parts of a tRPC middleware result this needs; `next()` reports failures here, not by throwing. */
type ProcedureOutcome = { ok: true } | { ok: false; error: { code: string; message: string } };

/**
 * Wraps one procedure call in a span and records its duration.
 *
 * Lives as a plain function rather than a `t.middleware(...)` because `@/trpc/init` applies it
 * to the base procedure, and importing the middleware builder back from there would be a cycle.
 *
 * The span is a child of the HTTP server span Next.js already opens for
 * `POST /api/trpc/[trpc]`, which on its own only ever says that *something* on the batched
 * endpoint was slow. `withSpan` is a no-op in development and during the build; the histogram
 * is not, so local runs still produce numbers.
 */
export const traceProcedure = async <TOutcome extends ProcedureOutcome>(options: {
  path: string;
  type: string;
  next: () => Promise<TOutcome>;
  /** The Payload id of the signed-in user, if any; never a name or an email address. */
  userId?: string | undefined;
}): Promise<TOutcome> => {
  const { path, type, next, userId } = options;
  const startedAt = performance.now();

  return await withSpan(
    `trpc.${type} ${path}`,
    async (span) => {
      if (userId !== undefined) {
        span.setAttribute('user.id', userId);
        annotateRequest({ 'user.id': userId });
      }
      appendToRequest('trpc.procedures', `${type} ${path}`);
      const result = await next();
      const errorCode = result.ok ? undefined : result.error.code;

      if (!result.ok) {
        span.setAttribute('trpc.error_code', result.error.code);
        if (!EXPECTED_ERROR_CODES.has(result.error.code)) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: result.error.message });
        }
      }

      durationHistogram.record((performance.now() - startedAt) / 1000, {
        'trpc.path': path,
        'trpc.type': type,
        'trpc.error_code': errorCode ?? 'ok',
      });

      return result;
    },
    { 'trpc.path': path, 'trpc.type': type },
  );
};
