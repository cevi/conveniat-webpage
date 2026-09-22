import type { BillingLogger } from '@/features/billing/ports/logger.port';
import type { LogAttributes } from '@/utils/server-logger';

/** The part of Payload's Pino logger this uses: attributes first, message second. */
type PinoLikeLogger = Record<
  'debug' | 'info' | 'warn' | 'error',
  (attributes: Record<string, unknown>, message: string) => void
>;

/**
 * Adapts `payload.logger` to the attribute-taking shape the billing use cases expect, binding
 * an id that every line of one run shares.
 *
 * The billing endpoints used to hand their use cases a shim that dropped everything but the
 * message, so a group id, a count or a duration could only reach Loki interpolated into the
 * text — unfilterable, and invisible to a line filter that does not already know the exact
 * wording. The run id exists because these runs overlap: the walk takes around 45 seconds,
 * several editors may start one at once, and each replica logs its own.
 *
 * @param payloadLogger the request's `payload.logger`
 * @param runId identifies one run; surfaces as `billing.run_id`
 * @returns a logger that writes `billing.run_id` on every record
 */
export const runScopedLogger = (payloadLogger: PinoLikeLogger, runId: string): BillingLogger => {
  const write =
    (level: 'debug' | 'info' | 'warn' | 'error') =>
    (message: string, attributes?: LogAttributes): void => {
      // `err` rather than `error`: Pino serialises an error under that key, and it is what the
      // rest of the Payload-side logging in this feature already uses.
      const { error, ...rest } = attributes ?? {};
      payloadLogger[level](
        {
          'billing.run_id': runId,
          ...rest,
          ...(error === undefined ? {} : { err: error }),
        },
        message,
      );
    };

  return {
    debug: write('debug'),
    info: write('info'),
    warn: write('warn'),
    error: write('error'),
  };
};
