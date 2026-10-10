import { redis } from '@/lib/db/redis';
import type { Payload } from 'payload';

/**
 * The DSN status codes that say this one mailbox does not exist: unknown, malformed, moved
 * or disabled. One such bounce suppresses the address.
 *
 * Deliberately not all of `5.x.x`. A policy rejection (`5.7.x`, or the `5.0.0` of a failed
 * SPF check) is about us or about the message, and never suppresses anybody.
 */
const DEAD_ADDRESS_STATUSES = new Set(['5.1.1', '5.1.3', '5.1.6', '5.1.10', '5.2.1']);

/**
 * Failures that may pass: a full mailbox (`x.2.2`), a domain that does not resolve
 * (`x.1.2`), a host that cannot be reached or routed to (`x.4.x`). The last one is also how
 * Microsoft 365 answers for a recipient it does not know (`5.4.1`).
 *
 * One of these proves nothing, since a DNS outage at one provider produces them for
 * everybody there. An address is suppressed once it has kept failing like this for
 * {@link REPEATED_BOUNCE_SPAN_MS} with nothing delivered in between. The class digit is
 * ignored, because a mail given up on after days of retries keeps its `4.x.x` code.
 */
const REPEATED_BOUNCE_STATUS = /^[45]\.(?:1\.2|2\.2|4\.\d+)$/;

/** Two weeks, the span M3AAWG's sender guide names for removing an address that keeps bouncing. */
const REPEATED_BOUNCE_SPAN_MS = 14 * 24 * 60 * 60 * 1000;

/** After this long without a further bounce, the next one starts over. */
const BOUNCE_STRIKE_TTL_SECONDS = 90 * 24 * 60 * 60;

const bounceStrikeKey = (email: string): string => `email:bounce-strike:${email}`;

/** The first of a run of passing failures, and the mail the latest one was about. */
interface BounceStrike {
  firstAt: number;
  outgoingEmailId: string;
}

const readBounceStrike = async (email: string): Promise<BounceStrike | undefined> => {
  const stored = await redis.get(bounceStrikeKey(email));
  if (stored === null) return undefined;
  try {
    const strike = JSON.parse(stored) as Partial<BounceStrike>;
    return typeof strike.firstAt === 'number' && typeof strike.outgoingEmailId === 'string'
      ? { firstAt: strike.firstAt, outgoingEmailId: strike.outgoingEmailId }
      : undefined;
  } catch {
    return undefined;
  }
};

// Only what separates addresses is excluded. An apostrophe is part of some people's address.
const ADDRESS_PATTERN = /[^\s<>,;"]+@[^\s<>,;"]+/g;

/**
 * The addresses in a `to` value, lower-cased and without duplicates.
 *
 * @param to - One address, several joined by commas, or a list of either.
 */
export const recipientAddresses = (to: unknown): string[] => {
  let text = '';
  if (typeof to === 'string') text = to;
  else if (Array.isArray(to)) text = to.map(String).join(', ');
  return [...new Set((text.match(ADDRESS_PATTERN) ?? []).map((address) => address.toLowerCase()))];
};

/**
 * Sorts the recipients of a mail into those that may be written to and those that bounced
 * for good before.
 *
 * Mail servers that keep getting mail for addresses that do not exist put the sender on a
 * spam list, so nothing goes to a suppressed address until its entry is deleted.
 */
export const splitSuppressedRecipients = async (
  payload: Payload,
  to: unknown,
): Promise<{ deliverable: string[]; suppressed: string[] }> => {
  const addresses = recipientAddresses(to);
  if (addresses.length === 0) return { deliverable: [], suppressed: [] };

  const found = await payload.find({
    collection: 'email-suppressions',
    where: { email: { in: addresses } },
    limit: addresses.length,
    depth: 0,
    pagination: false,
  });
  const suppressed = new Set(found.docs.map((entry) => entry.email));

  return {
    deliverable: addresses.filter((address) => !suppressed.has(address)),
    suppressed: addresses.filter((address) => suppressed.has(address)),
  };
};

/** What the delivery log of a mail says about the recipients it was withheld from. */
export const suppressedReason = (suppressed: string[]): string =>
  `Not sent: ${suppressed.join(', ')} bounced before and is on the list of suppressed addresses. Delete the entry there to send again.`;

const suppress = async (
  payload: Payload,
  email: string,
  status: string,
  outgoingEmailId: string,
): Promise<void> => {
  const existing = await payload.count({
    collection: 'email-suppressions',
    where: { email: { equals: email } },
  });
  if (existing.totalDocs > 0) return;

  await payload.create({
    collection: 'email-suppressions',
    data: { email, status, outgoingEmail: outgoingEmailId },
  });
  payload.logger.info(
    `Suppressed a recipient of outgoing email ${outgoingEmailId} after a ${status} bounce.`,
  );
};

/**
 * Whether a passing failure completes a run that is long enough to suppress the address.
 *
 * The run is kept in Redis and nowhere else. Losing it costs one more bounce before an
 * address is suppressed, so a Redis that cannot be reached must not hold up the bounce.
 */
const hasKeptBouncing = async (
  payload: Payload,
  email: string,
  outgoingEmailId: string,
): Promise<boolean> => {
  try {
    const strike = await readBounceStrike(email);
    const firstAt = strike?.firstAt ?? Date.now();
    if (Date.now() - firstAt >= REPEATED_BOUNCE_SPAN_MS) {
      await redis.del(bounceStrikeKey(email));
      return true;
    }
    await redis.set(
      bounceStrikeKey(email),
      JSON.stringify({ firstAt, outgoingEmailId } satisfies BounceStrike),
      'EX',
      BOUNCE_STRIKE_TTL_SECONDS,
    );
  } catch (error: unknown) {
    payload.logger.warn({
      err: error instanceof Error ? error : new Error(String(error)),
      msg: `Could not count the bounce of outgoing email ${outgoingEmailId} towards a suppression`,
    });
  }
  return false;
};

/**
 * Ends a run of passing failures, because a later mail got through.
 *
 * A report for the mail that bounced last does not count: the relay confirms the hand-off
 * of that same mail, and the two reports are not read in the order they happened.
 */
const forgetBounces = async (
  payload: Payload,
  email: string,
  outgoingEmailId: string,
): Promise<void> => {
  try {
    const strike = await readBounceStrike(email);
    if (strike === undefined || strike.outgoingEmailId === outgoingEmailId) return;
    await redis.del(bounceStrikeKey(email));
  } catch (error: unknown) {
    payload.logger.warn({
      err: error instanceof Error ? error : new Error(String(error)),
      msg: `Could not clear the bounces counted before outgoing email ${outgoingEmailId}`,
    });
  }
};

/**
 * Applies one delivery report to the suppression list.
 *
 * A bounce that says the mailbox does not exist suppresses the address at once. A failure
 * that may pass suppresses it once it has kept failing for two weeks or more, and a mail
 * that gets through in between starts that count over.
 *
 * Only an address the mail was sent to is suppressed. Behind a mailing list, such as a
 * Cevi.DB group, a report names the member whose mailbox failed. That member is not ours to
 * suppress, and the list address must keep working for everybody else on it.
 *
 * Called before the report is recorded on the mail, and throws when the list cannot be
 * written. The notification then stays in the mailbox and is read again, so a failure here
 * loses neither the suppression nor records the bounce twice.
 */
export const applyDeliveryReport = async (
  payload: Payload,
  outgoingEmail: { id: string; to?: string | undefined },
  report: { email?: string | undefined; action?: string | undefined; status?: string | undefined },
): Promise<void> => {
  if (report.email === undefined) return;
  const email = report.email.toLowerCase();
  if (!recipientAddresses(outgoingEmail.to).includes(email)) return;

  if (report.action === 'delivered' || report.action === 'relayed') {
    await forgetBounces(payload, email, outgoingEmail.id);
    return;
  }
  if (report.action !== 'failed' || report.status === undefined) return;

  const isGone =
    DEAD_ADDRESS_STATUSES.has(report.status) ||
    (REPEATED_BOUNCE_STATUS.test(report.status) &&
      (await hasKeptBouncing(payload, email, outgoingEmail.id)));
  if (isGone) await suppress(payload, email, report.status, outgoingEmail.id);
};
