// Type-only, so the admin panel can read the attempt limit without bundling the Prisma client.
import type { PushNotificationKind } from '@/lib/prisma';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * How long a push stays worth delivering, in seconds. The push services hold it this long for
 * a device that is offline, and the queue stops retrying it after that.
 *
 * Without it web-push sends its default of four weeks, and a phone switched on after the camp
 * lights up with every chat message it missed.
 */
export const PUSH_TIME_TO_LIVE_SECONDS: Record<PushNotificationKind, number> = {
  EMERGENCY: HOUR,
  SUPPORT: HOUR,
  CHAT: DAY,
  ANNOUNCEMENT: DAY,
  SYSTEM: HOUR,
};

/**
 * Deliveries with a higher priority are claimed first, and the ones at or above
 * {@link URGENT_PRIORITY} have a lane of their own, so an alert never waits behind the
 * thousands of deliveries of an announcement. A chat message ranks above an announcement too:
 * someone is waiting for the answer, while a broadcast is not hurt by a few seconds.
 */
export const PUSH_PRIORITY: Record<PushNotificationKind, number> = {
  EMERGENCY: 3,
  SUPPORT: 2,
  CHAT: 1,
  SYSTEM: 1,
  ANNOUNCEMENT: 0,
};

export const URGENT_PRIORITY = 2;

/** Kinds that wake someone up. They go out as high urgency, and their outcome is logged at info. */
export const isUrgentKind = (kind: PushNotificationKind): boolean =>
  PUSH_PRIORITY[kind] >= URGENT_PRIORITY;

/** A delivery that failed this many times gives up, even if its push has not expired yet. */
export const MAX_DELIVERY_ATTEMPTS = 5;

/** Wait before attempt 2, 3, 4 and 5. The queue is swept once a minute, so less is not kept. */
const RETRY_DELAYS_SECONDS = [MINUTE, 5 * MINUTE, 15 * MINUTE, 30 * MINUTE];

/** Spreads retries out, so the devices of one push service do not all come back at once. */
const JITTER = 0.2;

/**
 * When a delivery that just failed its `attempts`-th attempt may be tried again, or `undefined`
 * when it should give up: it ran out of attempts, or the next one would come after its push
 * expired.
 *
 * A push service that asks for a pause with `Retry-After` gets at least that pause.
 */
export const nextAttemptAfterFailure = ({
  attempts,
  now,
  expiresAt,
  retryAfterSeconds,
  random = Math.random,
}: {
  attempts: number;
  now: Date;
  expiresAt: Date;
  retryAfterSeconds?: number | undefined;
  random?: () => number;
}): Date | undefined => {
  if (attempts >= MAX_DELIVERY_ATTEMPTS) return undefined;

  const backoff = RETRY_DELAYS_SECONDS[Math.min(attempts, RETRY_DELAYS_SECONDS.length) - 1] ?? 0;
  const jittered = backoff * (1 + JITTER * (2 * random() - 1));
  const delaySeconds = Math.max(jittered, retryAfterSeconds ?? 0);

  const next = new Date(now.getTime() + delaySeconds * 1000);
  return next < expiresAt ? next : undefined;
};
