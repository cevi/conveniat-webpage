export interface Pop3Message {
  id: number;
  uid: string;
}

/**
 * Picks the messages one bounce run reads.
 *
 * The POP3 mailbox is shared with the other deployments and also collects DMARC aggregate
 * reports and spam, so most of what sits in it carries nothing for this deployment. Such a
 * message is never deleted, which makes selecting by mailbox position a trap: the oldest
 * messages are the ones least likely to be actionable, and once enough of them pile up at the
 * head, every run reads the same unusable block and never reaches a newer delivery
 * notification. Messages already read and found empty are therefore dropped from the
 * selection, and what remains is taken newest first.
 *
 * @param messages - The mailbox listing, oldest first, as POP3 returns it.
 * @param ignoredUids - UIDs already read and found to carry nothing for this deployment.
 * @param maxMessages - How many messages a single run may read.
 * @returns The messages to read, newest first.
 */
export const selectMessagesToProcess = (
  messages: Pop3Message[],
  ignoredUids: ReadonlySet<string>,
  maxMessages: number,
): Pop3Message[] =>
  [...messages]
    .reverse()
    .filter(({ uid }) => !ignoredUids.has(uid))
    .slice(0, maxMessages);
