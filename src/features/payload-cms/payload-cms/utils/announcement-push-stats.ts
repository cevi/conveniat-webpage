import prisma from '@/lib/db/prisma';

/** The fields of a push log row the summary needs. */
export interface PushLogSummaryRow {
  userId: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  deliveredAt: Date | null;
  interactionType: string | null;
}

/**
 * How an announcement's push notifications fared, counted in people rather than log rows:
 * a person with a phone and a laptop gets two pushes but is one recipient.
 */
export interface AnnouncementPushStats {
  /** People at least one push was sent to. */
  recipients: number;
  /** People with at least one push the push service accepted. */
  accepted: number;
  /**
   * People with at least one push their device confirmed. Before the SENT status existed,
   * an accepted push was recorded as delivered too, so older announcements count the same
   * people here as under {@link accepted}.
   */
  delivered: number;
  /** People who opened the announcement by tapping a push. */
  clicked: number;
  /** People who swiped a push away without opening it, and never tapped another one. */
  dismissed: number;
  /** People none of whose pushes could be delivered. */
  failed: number;
  /** People who read the announcement in the chat, whether they got a push or not. */
  readInChat: number;
}

/**
 * Folds the push log rows of one announcement into per-person counts.
 */
export const summarizePushLogs = (
  logs: readonly PushLogSummaryRow[],
  readInChat: number,
): AnnouncementPushStats => {
  const recipients = new Set<string>();
  const accepted = new Set<string>();
  const delivered = new Set<string>();
  const clicked = new Set<string>();
  const dismissed = new Set<string>();
  const failed = new Set<string>();

  for (const log of logs) {
    recipients.add(log.userId);
    // A device can only confirm a push the push service accepted.
    const isDelivered = log.status === 'DELIVERED' || log.deliveredAt !== null;
    if (log.status === 'FAILED') failed.add(log.userId);
    if (isDelivered || log.status === 'SENT') accepted.add(log.userId);
    if (isDelivered) delivered.add(log.userId);
    if (log.interactionType === 'CLICK') clicked.add(log.userId);
    if (log.interactionType === 'DISMISS') dismissed.add(log.userId);
  }

  const countWithout = (people: Set<string>, excluded: Set<string>): number =>
    [...people].filter((userId) => !excluded.has(userId)).length;

  return {
    recipients: recipients.size,
    accepted: accepted.size,
    delivered: delivered.size,
    clicked: clicked.size,
    dismissed: countWithout(dismissed, clicked),
    failed: countWithout(failed, accepted),
    readInChat,
  };
};

/**
 * Loads the push and read statistics of the chat message an announcement was published as.
 *
 * Chat pushes log `{"type":"chat_message","messageId":…}` as their content instead of the
 * message text, so the logs of one message are found by that id inside the content.
 */
export const getAnnouncementPushStats = async (
  chatMessageUuid: string,
): Promise<AnnouncementPushStats> => {
  const [logs, readers] = await Promise.all([
    prisma.pushNotificationLog.findMany({
      where: { content: { contains: `"messageId":"${chatMessageUuid}"` } },
      select: { userId: true, status: true, deliveredAt: true, interactionType: true },
    }),
    prisma.messageEvent.groupBy({
      by: ['userId'],
      // eslint-disable-next-line unicorn/no-null -- Prisma matches a SQL NULL only through null
      where: { messageId: chatMessageUuid, type: 'READ', userId: { not: null } },
    }),
  ]);
  return summarizePushLogs(logs, readers.length);
};
