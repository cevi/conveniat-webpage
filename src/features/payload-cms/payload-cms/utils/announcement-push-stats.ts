import prisma from '@/lib/db/prisma';

/** The fields of a push log row the summary needs. */
export interface PushLogSummaryRow {
  userId: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  deliveredAt: Date | null;
  interactionType: string | null;
  /** On a PENDING row, the reason its last attempt failed. */
  error: string | null;
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
  /** People none of whose pushes could be delivered, and none still waiting to be sent. */
  failed: number;
  /** People with no accepted push yet and at least one still waiting on the queue. */
  pending: number;
  /** The part of {@link pending} whose waiting push already failed once and will be retried. */
  retrying: number;
  /** People who read the announcement in the chat, whether they got a push or not. */
  readInChat: number;
}

/** When the queue started and finished delivering an announcement's push. */
export interface AnnouncementPushDelivery {
  queuedAt: Date;
  /** Empty while a delivery is still waiting to be sent. */
  completedAt: Date | undefined;
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
  const pending = new Set<string>();
  const retrying = new Set<string>();

  for (const log of logs) {
    recipients.add(log.userId);
    // A device can only confirm a push the push service accepted.
    const isDelivered = log.status === 'DELIVERED' || log.deliveredAt !== null;
    if (log.status === 'FAILED') failed.add(log.userId);
    if (isDelivered || log.status === 'SENT') accepted.add(log.userId);
    if (isDelivered) delivered.add(log.userId);
    if (log.status === 'PENDING') pending.add(log.userId);
    if (log.status === 'PENDING' && log.error !== null) retrying.add(log.userId);
    if (log.interactionType === 'CLICK') clicked.add(log.userId);
    if (log.interactionType === 'DISMISS') dismissed.add(log.userId);
  }

  const countWithout = (people: Set<string>, ...excluded: Set<string>[]): number =>
    [...people].filter((userId) => !excluded.some((set) => set.has(userId))).length;

  return {
    recipients: recipients.size,
    accepted: accepted.size,
    delivered: delivered.size,
    clicked: clicked.size,
    dismissed: countWithout(dismissed, clicked),
    failed: countWithout(failed, accepted, pending),
    pending: countWithout(pending, accepted),
    retrying: countWithout(retrying, accepted),
    readInChat,
  };
};

/**
 * Loads the push and read statistics of the chat message an announcement was published as.
 *
 * A push sent through the delivery queue is found by its message id. Pushes from before the
 * queue logged `{"type":"chat_message","messageId":…}` as their content and are only found by
 * searching that, which reads the whole table, so it runs only when the queue has none.
 */
export const getAnnouncementPushStats = async (
  chatMessageUuid: string,
): Promise<{ stats: AnnouncementPushStats; delivery: AnnouncementPushDelivery | undefined }> => {
  const notifications = await prisma.pushNotification.findMany({
    where: { messageId: chatMessageUuid },
    select: { id: true, createdAt: true, completedAt: true },
  });
  const [logs, readers] = await Promise.all([
    prisma.pushNotificationLog.findMany({
      where:
        notifications.length > 0
          ? { notificationId: { in: notifications.map((notification) => notification.id) } }
          : { content: { contains: `"messageId":"${chatMessageUuid}"` } },
      select: { userId: true, status: true, deliveredAt: true, interactionType: true, error: true },
    }),
    prisma.messageEvent.groupBy({
      by: ['userId'],
      // eslint-disable-next-line unicorn/no-null -- Prisma matches a SQL NULL only through null
      where: { messageId: chatMessageUuid, type: 'READ', userId: { not: null } },
    }),
  ]);

  // An announcement goes out as one message with one push, so this is normally one row.
  const completions = notifications.flatMap((notification) =>
    notification.completedAt === null ? [] : [notification.completedAt.getTime()],
  );
  const delivery =
    notifications.length === 0
      ? undefined
      : {
          queuedAt: new Date(Math.min(...notifications.map((row) => row.createdAt.getTime()))),
          completedAt:
            completions.length === notifications.length
              ? new Date(Math.max(...completions))
              : undefined,
        };
  return { stats: summarizePushLogs(logs, readers.length), delivery };
};
