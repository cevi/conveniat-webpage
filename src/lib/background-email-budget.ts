import { environmentVariables } from '@/config/environment-variables';
import { redis } from '@/lib/db/redis';
import { randomUUID } from 'node:crypto';

const BUDGET_KEY = 'email:background-budget';
const WINDOW_MS = 60 * 60 * 1000;

/**
 * Claims one send if the last hour has room for it.
 *
 * One script, because two replicas checking and then claiming in separate round trips
 * would both see the last free slot. Every claim is a member scored with the time it was
 * made, so "the last hour" is whatever has not been trimmed off the front.
 */
const RESERVE_SCRIPT = `
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
redis.call("zremrangebyscore", KEYS[1], "-inf", now - window)
if redis.call("zcard", KEYS[1]) >= tonumber(ARGV[3]) then
  return 0
end
redis.call("zadd", KEYS[1], now, ARGV[4])
redis.call("pexpire", KEYS[1], window)
return 1
`;

/**
 * Claims room for one mail the background queue is about to send.
 *
 * The mail server refuses everything past its hourly limit, and it does not care whether
 * the refused mail is the four-hundredth bill or a contact form confirmation somebody is
 * waiting for. Bulk mail therefore stays inside its own share of that limit and leaves
 * the rest to mail a person triggered. The server looks at the last sixty minutes on every
 * send rather than at the clock hour, so this does too.
 *
 * The count lives in Redis because both replicas send. A claim is not handed back when the
 * send fails afterwards: the server may have counted the attempt.
 *
 * Throws when Redis is unreachable. A queue that cannot tell how much it has sent must
 * not send.
 *
 * @returns whether the mail may go out now
 */
export const reserveBackgroundEmail = async (): Promise<boolean> => {
  const granted = await redis.eval(
    RESERVE_SCRIPT,
    1,
    BUDGET_KEY,
    Date.now(),
    WINDOW_MS,
    environmentVariables.BACKGROUND_EMAIL_HOURLY_LIMIT,
    randomUUID(),
  );
  return granted === 1;
};
