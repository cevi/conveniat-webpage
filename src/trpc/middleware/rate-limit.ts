import { redis } from '@/lib/db/redis';
import { middleware } from '@/trpc/init';
import type { StaticTranslationString } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import { TRPCError } from '@trpc/server';

const logger = createLogger('trpc:rate-limit');

/**
 * Counts one call and returns the count inside the current window. The window starts with
 * the first call and is not extended by later ones, rejected calls included, so a client
 * that keeps retrying is let through again once the window has run out.
 */
const COUNT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end
return count
`;

export const RATE_LIMIT_KEY_PREFIX = 'rate-limit:';

interface RateLimitOptions {
  /** Names the counter, e.g. `chat.sendMessage`. Each user has one counter per name. */
  name: string;
  /** Calls allowed per window. A burst up to this number goes through at once. */
  limit: number;
  windowMs: number;
  /** Shown to the user who hit the limit. */
  message: StaticTranslationString;
}

/**
 * Limits how often one user may call a procedure, counted in Redis so the limit holds
 * across replicas. Answers `TOO_MANY_REQUESTS` past the limit, which the offline outbox
 * retries later instead of dropping the queued item.
 *
 * Fails open: when Redis cannot be reached the call goes through, because a camp that
 * cannot chat is worse than a camp that is briefly unprotected against spam.
 *
 * Put it before `databaseTransactionWrapper`, so a rejected call never opens a transaction.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- tRPC infers the middleware type
export const rateLimit = ({ name, limit, windowMs, message }: RateLimitOptions) =>
  middleware(async ({ ctx, next }) => {
    const userId = ctx.user?.uuid;
    if (userId === undefined) return next();

    let count: number;
    try {
      count = Number(
        await redis.eval(COUNT_SCRIPT, 1, `${RATE_LIMIT_KEY_PREFIX}${name}:${userId}`, windowMs),
      );
    } catch (error) {
      logger.warn('Rate limit not enforced, the counter could not be read', {
        error,
        'rate_limit.name': name,
      });
      return next();
    }

    if (count > limit) {
      // once per window and user: the first rejected call, not every retry after it
      if (count === limit + 1) {
        logger.info('Rate limit reached', { 'rate_limit.name': name, 'user.id': userId });
      }
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: message[ctx.locale] });
    }

    return next();
  });
