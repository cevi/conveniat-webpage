import type { Payload } from 'payload';

/**
 * The DSN status codes that say this one mailbox does not exist: unknown, malformed, moved
 * or disabled.
 *
 * Deliberately not all of `5.x.x`. A full mailbox (`5.2.2`) empties again, and a policy
 * rejection (`5.7.x`, or the `5.0.0` of a failed SPF check) is about us or about the
 * message. Codes about the whole domain (`5.1.2`, `5.4.x`) are left out too: a DNS outage
 * at one provider would otherwise suppress everybody there on the same day.
 */
const DEAD_ADDRESS_STATUSES = new Set(['5.1.1', '5.1.3', '5.1.6', '5.1.10', '5.2.1']);

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

/**
 * Puts the recipient of a bounced mail on the suppression list, when the bounce says the
 * address does not exist.
 *
 * Only an address the mail was sent to is suppressed. Behind a mailing list, such as a
 * Cevi.DB group, a report names the member whose mailbox failed. That member is not ours to
 * suppress, and the list address must keep working for everybody else on it.
 *
 * Called before the bounce is recorded on the mail, and throws when the list cannot be
 * written. The notification then stays in the mailbox and is read again, so a failure here
 * loses neither the suppression nor records the bounce twice.
 */
export const suppressBouncedRecipient = async (
  payload: Payload,
  outgoingEmail: { id: string; to?: string | undefined },
  bounce: { email?: string | undefined; action?: string | undefined; status?: string | undefined },
): Promise<void> => {
  if (bounce.action !== 'failed' || bounce.status === undefined || bounce.email === undefined) {
    return;
  }
  if (!DEAD_ADDRESS_STATUSES.has(bounce.status)) return;

  const email = bounce.email.toLowerCase();
  if (!recipientAddresses(outgoingEmail.to).includes(email)) return;

  const existing = await payload.count({
    collection: 'email-suppressions',
    where: { email: { equals: email } },
  });
  if (existing.totalDocs > 0) return;

  await payload.create({
    collection: 'email-suppressions',
    data: { email, status: bounce.status, outgoingEmail: outgoingEmail.id },
  });
  payload.logger.info(
    `Suppressed a recipient of outgoing email ${outgoingEmail.id} after a ${bounce.status} bounce.`,
  );
};
