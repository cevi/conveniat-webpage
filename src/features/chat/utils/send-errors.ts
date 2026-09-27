import type { AppRouter } from '@/trpc/routers/_app';
import { TRPCClientError } from '@trpc/client';

/** Server answers that may succeed on a later attempt, so a queued item waits for them. */
const RETRYABLE_CODES: ReadonlySet<string> = new Set([
  'UNAUTHORIZED',
  'INTERNAL_SERVER_ERROR',
  'TIMEOUT',
  'TOO_MANY_REQUESTS',
]);

/**
 * Whether a tRPC call failed before the server answered with a tRPC error: no connection,
 * the service worker giving up, or a proxy page instead of JSON. Only a real tRPC answer
 * carries `data`, so its absence is the signal. The message is useless for this, because it
 * differs per browser (Safari says "Load failed", Chrome "Failed to fetch").
 */
export const isTransportError = (error: unknown): boolean =>
  error instanceof TRPCClientError && error.data === undefined;

/**
 * Whether a queued send should stay queued after this failure. Anything else is permanent:
 * retrying the same input cannot change the answer.
 */
export const isRetryableSendError = (error: unknown): boolean => {
  if (isTransportError(error)) return true;
  if (!(error instanceof TRPCClientError)) return false;
  const code = (error as TRPCClientError<AppRouter>).data?.code;
  return code !== undefined && RETRYABLE_CODES.has(code);
};
