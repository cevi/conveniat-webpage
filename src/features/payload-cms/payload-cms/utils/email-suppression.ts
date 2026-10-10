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
 * everybody there. An address is suppressed once mails to it have kept failing like this
 * over {@link REPEATED_BOUNCE_SPAN_MS} with none getting through in between. The class digit
 * is ignored, because a mail given up on after days of retries keeps its `4.x.x` code.
 */
const REPEATED_BOUNCE_STATUS = /^[45]\.(?:1\.2|2\.2|4\.\d+)$/;

/** Two weeks, the span M3AAWG's sender guide names for removing an address that keeps bouncing. */
const REPEATED_BOUNCE_SPAN_MS = 14 * 24 * 60 * 60 * 1000;

/** After this long without a further bounce, the next one starts over. */
const BOUNCE_HISTORY_TTL_SECONDS = 90 * 24 * 60 * 60;

// Two sorted sets per address, each holding send attempts scored by when the mail was sent. They
// are kept by send time because reports are not read in the order things happened.
const bouncedKey = (email: string): string => `email:bounced-mails:${email}`;
const deliveredKey = (email: string): string => `email:delivered-mails:${email}`;

const sendTimes = async (key: string): Promise<number[]> => {
  const flat = await redis.zrange(key, 0, -1, 'WITHSCORES');
  return flat.filter((_, index) => index % 2 === 1).map(Number);
};

/**
 * Whether the mails that failed since the last one that got through span two weeks or more.
 */
const keepsBouncing = async (email: string): Promise<boolean> => {
  const lastDelivered = Math.max(-Infinity, ...(await sendTimes(deliveredKey(email))));
  const bounced = await sendTimes(bouncedKey(email));
  const run = bounced.filter((sentAt) => sentAt > lastDelivered);
  return run.length > 0 && Math.max(...run) - Math.min(...run) >= REPEATED_BOUNCE_SPAN_MS;
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
  const found = await payload.find({
    collection: 'email-suppressions',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    pagination: false,
  });
  const entry = found.docs[0];

  if (entry !== undefined) {
    // An entry made for repeated bounces can be lifted again by a late delivery. Once the
    // mailbox is known not to exist, the entry has to say so, or it would be lifted too.
    if (DEAD_ADDRESS_STATUSES.has(status) && !DEAD_ADDRESS_STATUSES.has(entry.status ?? '')) {
      await payload.update({
        collection: 'email-suppressions',
        id: entry.id,
        data: { status, outgoingEmail: outgoingEmailId },
      });
    }
    return;
  }

  await payload.create({
    collection: 'email-suppressions',
    data: { email, status, outgoingEmail: outgoingEmailId },
  });
  payload.logger.info(
    `Suppressed a recipient of outgoing email ${outgoingEmailId} after a ${status} bounce.`,
  );
};

/**
 * Lifts a suppression that the repeated-bounce rule made, once a mail turns out to have got
 * through in between. One made because the mailbox does not exist is left alone.
 */
const liftRepeatedBounceSuppression = async (payload: Payload, email: string): Promise<void> => {
  const found = await payload.find({
    collection: 'email-suppressions',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    pagination: false,
  });
  const entry = found.docs[0];
  if (entry === undefined || !REPEATED_BOUNCE_STATUS.test(entry.status ?? '')) return;

  await payload.delete({ collection: 'email-suppressions', id: entry.id });
  payload.logger.info(
    `Lifted the suppression ${entry.id}: a mail sent between the bounces was delivered.`,
  );
};

/**
 * Counts one report towards the repeated-bounce rule and brings the list in line with it.
 *
 * Nothing is taken out of Redis here, so reading the same notification again after a
 * failed write comes to the same result. A hand-off report for a mail that bounced is not
 * a delivery, whichever of the two reports is read first.
 */
const applyToBounceHistory = async (
  payload: Payload,
  email: string,
  outgoingEmail: { id: string; sentAt: number },
  failedWith?: string,
): Promise<void> => {
  // A resend is another attempt under the same id, and it can fail or get through on its own.
  const attempt = `${outgoingEmail.id}:${String(outgoingEmail.sentAt)}`;
  let isSuppressing: boolean;
  try {
    if (failedWith === undefined) {
      // Deliveries only matter while there are bounces they could come between, and the
      // hand-off of a mail that bounced is not one.
      const countsAsDelivery =
        (await redis.exists(bouncedKey(email))) === 1 &&
        (await redis.zscore(bouncedKey(email), attempt)) === null;
      if (!countsAsDelivery) return;
      await redis.zadd(deliveredKey(email), outgoingEmail.sentAt, attempt);
    } else {
      await redis.zrem(deliveredKey(email), attempt);
      await redis.zadd(bouncedKey(email), outgoingEmail.sentAt, attempt);
      await redis.expire(bouncedKey(email), BOUNCE_HISTORY_TTL_SECONDS);
    }
    await redis.expire(deliveredKey(email), BOUNCE_HISTORY_TTL_SECONDS);
    isSuppressing = await keepsBouncing(email);
  } catch (error: unknown) {
    // The history is only kept in Redis. Losing a report costs one more bounce before an
    // address is suppressed, so a Redis that cannot be reached must not hold up the bounce.
    payload.logger.warn({
      err: error instanceof Error ? error : new Error(String(error)),
      msg: `Could not count the report on outgoing email ${outgoingEmail.id} towards a suppression`,
    });
    return;
  }

  if (failedWith === undefined) {
    if (!isSuppressing) await liftRepeatedBounceSuppression(payload, email);
  } else if (isSuppressing) {
    await suppress(payload, email, failedWith, outgoingEmail.id);
  }
};

/**
 * Applies one delivery report to the suppression list.
 *
 * A bounce that says the mailbox does not exist suppresses the address at once. A failure
 * that may pass suppresses it once mails have kept failing over two weeks or more, and a
 * mail that got through in between starts that count over.
 *
 * Only an address the mail was sent to is suppressed. Behind a mailing list, such as a
 * Cevi.DB group, a report names the member whose mailbox failed. That member is not ours to
 * suppress, and the list address must keep working for everybody else on it.
 *
 * Called before the report is recorded on the mail, and throws when the list cannot be
 * written. The notification then stays in the mailbox and is read again, so a failure here
 * loses neither the suppression nor records the bounce twice.
 *
 * @param outgoingEmail - The mail the report is about, with the time it was sent.
 */
export const applyDeliveryReport = async (
  payload: Payload,
  outgoingEmail: { id: string; to?: string | undefined; sentAt: number },
  report: { email?: string | undefined; action?: string | undefined; status?: string | undefined },
): Promise<void> => {
  if (report.email === undefined) return;
  const email = report.email.toLowerCase();
  if (!recipientAddresses(outgoingEmail.to).includes(email)) return;

  if (report.action === 'delivered' || report.action === 'relayed') {
    await applyToBounceHistory(payload, email, outgoingEmail);
    return;
  }
  if (report.action !== 'failed' || report.status === undefined) return;

  if (DEAD_ADDRESS_STATUSES.has(report.status)) {
    await suppress(payload, email, report.status, outgoingEmail.id);
  } else if (REPEATED_BOUNCE_STATUS.test(report.status)) {
    await applyToBounceHistory(payload, email, outgoingEmail, report.status);
  }
};
