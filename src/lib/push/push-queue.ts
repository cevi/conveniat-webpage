import type { PushNotificationSubscription } from '@/features/payload-cms/payload-types';
import prisma from '@/lib/db/prisma';
import type { NotificationType } from '@/lib/notification-type';
import type { PushNotification, PushNotificationChannel } from '@/lib/prisma';
import { PushNotificationKind } from '@/lib/prisma';
import type { PushDropReason, PushQueueSnapshot } from '@/lib/push-metrics';
import {
  recordPushDeliveriesDropped,
  recordPushDeliveriesEnqueued,
  recordPushNotificationCompleted,
  recordPushRecipients,
  recordPushSend,
  registerPushQueueGauges,
} from '@/lib/push-metrics';
import {
  isUrgentKind,
  MAX_DELIVERY_ATTEMPTS,
  nextAttemptAfterFailure,
  PUSH_PRIORITY,
  PUSH_TIME_TO_LIVE_SECONDS,
  URGENT_PRIORITY,
} from '@/lib/push/push-delivery-policy';
import type { PushMessage, PushTransportResult } from '@/lib/push/push-transport';
import { channelOf, composePushText, sendPushToDevice } from '@/lib/push/push-transport';
import { createLogger } from '@/utils/server-logger';
import { withSpan } from '@/utils/tracing-helpers';
import config from '@payload-config';
import { getPayload } from 'payload';

/**
 * The push delivery queue.
 *
 * A push is one `PushNotification` row holding what every device is sent, plus one
 * `PushNotificationLog` row per device. The log rows are the queue: a worker claims a batch of
 * due rows, sends them, and writes the outcome back onto the same rows the devices later report
 * delivery and taps to.
 *
 * Why not Payload's job queue: it claims jobs with a find followed by an update that does not
 * re-check `processing`, so both replicas can run the same job, and every job is a Mongo document
 * with a log array. Postgres claims with `FOR UPDATE SKIP LOCKED`, which hands every row to
 * exactly one worker, and lets both replicas share one push without talking to each other.
 *
 * Who works the queue:
 *
 * - The replica that queued a push starts on it straight away, so a chat message is not held
 *   back by a poll interval.
 * - The `drainPushQueue` Payload task sweeps it every minute on whichever replica runs it. That
 *   sweep sends retries once they are due, and picks up the rows of a replica that stopped in
 *   the middle of a push, once their lease ran out.
 *
 * A delivery is sent at least once, not exactly once: a replica stopped between sending and
 * writing back leaves rows another replica sends again. The log row id travels as the collapse
 * key (`topic` for web push, `apns-collapse-id` for iOS), so the second copy replaces the first.
 */
const logger = createLogger('push:queue');

/** Rows claimed at once. Small enough that an alert never waits long for a free worker. */
const BATCH_SIZE = 100;

/**
 * Sends in flight at once per lane. Every send is an outbound request to a push service; the
 * database is only touched per batch, so this bounds sockets and memory, not the pool.
 */
const SEND_CONCURRENCY = 25;

/**
 * How long a claimed row belongs to its worker. A batch of 100 at 25 in flight takes four web
 * push timeouts at worst, so this is well above what a live worker needs, and short enough that
 * a stopped replica's rows go out again within a couple of minutes.
 */
const LEASE_SECONDS = 120;

/** Only this many distinct errors of a batch make it into its log line. */
const MAX_LOGGED_ERRORS = 3;

/**
 * A lane is a worker loop of its own. The urgent lane only takes emergency and support
 * deliveries, so an alert goes out while the regular lane is still busy with the thousands of
 * deliveries of an announcement. The regular lane takes everything, urgent first.
 */
export type PushQueueLane = 'urgent' | 'all';

const MIN_PRIORITY: Record<PushQueueLane, number> = { urgent: URGENT_PRIORITY, all: 0 };

/** A push to queue, before it is split into one delivery per device. */
export interface QueuedPush {
  kind: PushNotificationKind;
  recipientUserIds: readonly string[];
  /** Markdown is stripped and the text cut to fit, see `composePushText`. */
  title: string;
  body: string;
  url?: string | undefined;
  chatId?: string | undefined;
  messageId?: string | undefined;
  notificationType?: NotificationType | undefined;
  ignoreIfUrlMatches?: boolean | undefined;
  /** What each log row shows in the admin panel. Defaults to the body. */
  logContent?: string | undefined;
}

export interface EnqueueResult {
  /** Empty when none of the recipients has a push device. */
  notificationId?: string;
  deliveries: number;
}

/** Enqueue writes at most this many rows per statement, far below Postgres' 65535 parameters. */
const INSERT_CHUNK_SIZE = 1000;

const recipientIdOf = (
  subscription: Pick<PushNotificationSubscription, 'user'>,
): string | undefined =>
  typeof subscription.user === 'object' ? subscription.user?.id : (subscription.user ?? undefined);

/**
 * Queues a push for every device of the given people and starts working on it.
 *
 * Returns once the deliveries are stored, not once they are sent. From then on they survive
 * a restart of this replica.
 */
export async function enqueuePushNotification(push: QueuedPush): Promise<EnqueueResult> {
  return withSpan(
    'push.enqueue',
    async (span) => {
      const payload = await getPayload({ config });
      const recipients = new Set(push.recipientUserIds);
      const { docs: subscriptions } = await payload.find({
        collection: 'push-notification-subscriptions',
        where: { user: { in: [...recipients] } },
        // No `limit`: an explicit limit binds even alongside `pagination: false`
        // (`sanitizedLimit = limit ?? (usePagination ? 10 : 0)` in payload's find
        // operation). A limit once silently dropped everybody past the 1000th device.
        pagination: false,
        depth: 0,
        select: { user: true, platform: true },
      });

      const withDevice = new Set(subscriptions.map((subscription) => recipientIdOf(subscription)));
      const withoutDevice = [...recipients].filter((id) => !withDevice.has(id)).length;
      recordPushRecipients(push.kind, recipients.size - withoutDevice, withoutDevice);

      const summary = {
        'push.kind': push.kind,
        'push.recipients': recipients.size,
        'push.recipients_without_device': withoutDevice,
        'push.subscriptions': subscriptions.length,
        'chat.id': push.chatId,
        'message.id': push.messageId,
      };
      span.setAttributes(summary);

      const deliveries = subscriptions.flatMap((subscription) => {
        const userId = recipientIdOf(subscription);
        return userId === undefined ? [] : [{ subscription, userId }];
      });
      if (deliveries.length === 0) {
        logAtKindLevel(push.kind, 'Push reached no device', summary);
        return { deliveries: 0 };
      }

      const text = composePushText({ title: push.title, body: push.body });
      const now = new Date();
      const notification = await prisma.$transaction(async (transaction) => {
        const created = await transaction.pushNotification.create({
          data: {
            kind: push.kind,
            title: text.title,
            body: text.body,
            ...(push.url !== undefined && { url: push.url }),
            ...(push.chatId !== undefined && { chatId: push.chatId }),
            ...(push.messageId !== undefined && { messageId: push.messageId }),
            ...(push.notificationType !== undefined && {
              notificationType: push.notificationType,
            }),
            ignoreIfUrlMatches: push.ignoreIfUrlMatches ?? false,
            expiresAt: new Date(now.getTime() + PUSH_TIME_TO_LIVE_SECONDS[push.kind] * 1000),
          },
          select: { id: true },
        });
        for (let start = 0; start < deliveries.length; start += INSERT_CHUNK_SIZE) {
          await transaction.pushNotificationLog.createMany({
            data: deliveries
              .slice(start, start + INSERT_CHUNK_SIZE)
              .map(({ subscription, userId }) => ({
                notificationId: created.id,
                subscriptionId: subscription.id,
                userId,
                kind: push.kind,
                channel: channelOf(subscription),
                priority: PUSH_PRIORITY[push.kind],
                content: push.logContent ?? text.body,
                status: 'PENDING' as const,
                sentAt: now,
                nextAttemptAt: now,
              })),
            skipDuplicates: true,
          });
        }
        return created;
      });

      recordPushDeliveriesEnqueued(push.kind, deliveries.length);
      span.setAttribute('push.notification_id', notification.id);
      logAtKindLevel(push.kind, 'Push queued', {
        ...summary,
        'push.notification_id': notification.id,
        'push.deliveries': deliveries.length,
      });

      kickPushQueue(isUrgentKind(push.kind) ? 'urgent' : 'all');
      return { notificationId: notification.id, deliveries: deliveries.length };
    },
    { 'push.kind': push.kind },
  );
}

/**
 * Emergency, support and announcement pushes are rare, and whether one reached anybody must
 * not depend on trace sampling. A chat message fires per request, so it stays at debug and the
 * `push_*` metrics count it instead.
 */
const logAtKindLevel = (
  kind: PushNotificationKind,
  message: string,
  attributes: Record<string, unknown>,
): void => {
  if (isUrgentKind(kind) || kind === PushNotificationKind.ANNOUNCEMENT) {
    logger.info(message, attributes);
  } else {
    logger.debug(message, attributes);
  }
};

/** What a whole drain did, for the task output and tests. */
export interface DrainSummary {
  batches: number;
  accepted: number;
  expired: number;
  retried: number;
  failed: number;
  dropped: number;
}

const emptySummary = (): DrainSummary => ({
  batches: 0,
  accepted: 0,
  expired: 0,
  retried: 0,
  failed: 0,
  dropped: 0,
});

const running = new Map<PushQueueLane, Promise<DrainSummary>>();
const kickedWhileRunning = new Set<PushQueueLane>();

/** Starts working the lane in the background, or tells the loop already on it to look again. */
export function kickPushQueue(lane: PushQueueLane): void {
  drainPushQueue(lane).catch((error: unknown) => {
    logger.error('Working the push queue failed', { error, 'push.lane': lane });
  });
}

/**
 * Sends due deliveries until none are left. One loop per lane and process: a second call while
 * the loop runs joins it instead of starting another, so a burst of chat messages cannot
 * multiply the sends in flight.
 */
export function drainPushQueue(lane: PushQueueLane = 'all'): Promise<DrainSummary> {
  registerPushQueueGauges(readQueueSnapshot);

  const current = running.get(lane);
  if (current !== undefined) {
    kickedWhileRunning.add(lane);
    return current;
  }

  const drain = (async (): Promise<DrainSummary> => {
    const total = emptySummary();
    try {
      do {
        kickedWhileRunning.delete(lane);
        for (;;) {
          const batch = await deliverNextBatch(lane);
          if (batch === undefined) break;
          for (const key of Object.keys(total) as (keyof DrainSummary)[]) {
            total[key] += batch[key];
          }
        }
      } while (kickedWhileRunning.has(lane));
    } finally {
      running.delete(lane);
    }
    return total;
  })();
  running.set(lane, drain);
  return drain;
}

interface ClaimedDelivery {
  id: string;
  userId: string;
  subscriptionId: string | null;
  notificationId: string;
  attempts: number;
  channel: PushNotificationChannel;
}

/**
 * Takes up to {@link BATCH_SIZE} due rows for this worker. `SKIP LOCKED` passes over rows
 * another replica is claiming at the same moment instead of waiting for them, so no row is
 * handed out twice. Prisma stores its timestamps as UTC without a zone, so `now()` is converted
 * explicitly rather than trusting the session's time zone.
 */
const claimDeliveries = async (minPriority: number): Promise<ClaimedDelivery[]> =>
  prisma.$queryRaw<ClaimedDelivery[]>`
    UPDATE "PushNotificationLog" AS log
    SET "leaseUntil" = timezone('UTC', now()) + make_interval(secs => ${LEASE_SECONDS}),
        "attempts" = log."attempts" + 1
    WHERE log.id IN (
      SELECT id FROM "PushNotificationLog"
      WHERE status = 'PENDING'
        AND "notificationId" IS NOT NULL
        AND priority >= ${minPriority}
        AND "nextAttemptAt" <= timezone('UTC', now())
        AND ("leaseUntil" IS NULL OR "leaseUntil" < timezone('UTC', now()))
      ORDER BY priority DESC, "nextAttemptAt", id
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING log.id, log."userId", log."subscriptionId", log."notificationId", log.attempts,
      log.channel::text AS channel`;

/** Reads the backlog for the `push_queue_*` gauges. */
export const readQueueSnapshot = async (): Promise<PushQueueSnapshot> => {
  const [row] = await prisma.$queryRaw<
    { due: bigint; in_flight: bigint; scheduled: bigint; oldest_due_seconds: number | null }[]
  >`
    WITH pending AS (
      SELECT "nextAttemptAt", "leaseUntil" >= timezone('UTC', now()) AS leased
      FROM "PushNotificationLog"
      WHERE status = 'PENDING' AND "notificationId" IS NOT NULL
    )
    SELECT
      count(*) FILTER (WHERE leased) AS in_flight,
      count(*) FILTER (WHERE leased IS NOT TRUE AND "nextAttemptAt" <= timezone('UTC', now())) AS due,
      count(*) FILTER (WHERE leased IS NOT TRUE AND "nextAttemptAt" > timezone('UTC', now())) AS scheduled,
      EXTRACT(EPOCH FROM timezone('UTC', now()) - min("nextAttemptAt")
        FILTER (WHERE leased IS NOT TRUE AND "nextAttemptAt" <= timezone('UTC', now())))::float8
        AS oldest_due_seconds
    FROM pending`;
  return {
    due: Number(row?.due ?? 0),
    inFlight: Number(row?.in_flight ?? 0),
    scheduled: Number(row?.scheduled ?? 0),
    oldestDueSeconds: row?.oldest_due_seconds ?? 0,
  };
};

const messageOf = (notification: PushNotification): PushMessage => ({
  title: notification.title,
  body: notification.body,
  url: notification.url ?? undefined,
  messageId: notification.messageId ?? undefined,
  notificationType: notification.notificationType === 'emergency' ? 'emergency' : undefined,
  ignoreIfUrlMatches: notification.ignoreIfUrlMatches,
});

/** How a row ends its turn: settled for good, or back to PENDING for a retry. */
interface Outcome {
  status: 'SENT' | 'FAILED' | 'PENDING';
  /** The last error. Cleared when the row is sent after all. */
  error?: string;
  /** Set only on a row going back to PENDING. */
  nextAttemptAt?: Date;
  sentAt?: Date;
}

/** Rows with the same outcome, so one batch costs a handful of updates rather than one per row. */
interface Settlement {
  ids: string[];
  outcome: Outcome;
}

const outcomeKey = (outcome: Outcome): string =>
  JSON.stringify([outcome.status, outcome.error, outcome.nextAttemptAt?.toISOString()]);

/** Runs `work` over every item with at most {@link SEND_CONCURRENCY} in flight. */
const forEachBounded = async <T>(items: T[], work: (item: T) => Promise<void>): Promise<void> => {
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const item = items[next];
      next++;
      if (item !== undefined) await work(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(SEND_CONCURRENCY, items.length) }, worker));
};

/**
 * Claims one batch and settles every row in it. Returns `undefined` when nothing was due.
 */
async function deliverNextBatch(lane: PushQueueLane): Promise<DrainSummary | undefined> {
  const claimed = await claimDeliveries(MIN_PRIORITY[lane]);
  if (claimed.length === 0) return undefined;

  return withSpan(
    'push.deliver_batch',
    async (span) => {
      const now = new Date();
      const payload = await getPayload({ config });
      const notificationIds = [...new Set(claimed.map((row) => row.notificationId))];
      const subscriptionIds = [
        ...new Set(
          claimed.flatMap((row) => (row.subscriptionId === null ? [] : [row.subscriptionId])),
        ),
      ];
      const [notifications, { docs: subscriptions }] = await Promise.all([
        prisma.pushNotification.findMany({ where: { id: { in: notificationIds } } }),
        payload.find({
          collection: 'push-notification-subscriptions',
          where: { id: { in: subscriptionIds } },
          pagination: false,
          depth: 0,
        }),
      ]);
      const notificationById = new Map(notifications.map((row) => [row.id, row]));
      const subscriptionById = new Map(
        subscriptions.map((subscription) => [subscription.id, subscription]),
      );

      const summary = emptySummary();
      summary.batches = 1;
      const settlements = new Map<string, Settlement>();
      const settle = (id: string, outcome: Outcome): void => {
        const key = outcomeKey(outcome);
        const group = settlements.get(key) ?? { ids: [], outcome };
        group.ids.push(id);
        settlements.set(key, group);
      };
      const errors = new Set<string>();
      const expiredSubscriptionIds: string[] = [];
      // One jitter per batch keeps its retries in one write; batches still spread out.
      const jitter = Math.random();

      const drop = (
        row: ClaimedDelivery,
        kind: PushNotificationKind,
        reason: PushDropReason,
        error: string,
      ): void => {
        summary.dropped++;
        recordPushDeliveriesDropped(kind, reason, 1);
        settle(row.id, { status: 'FAILED', error });
      };

      const sendable: {
        row: ClaimedDelivery;
        notification: PushNotification;
        subscription: PushNotificationSubscription;
      }[] = [];
      for (const row of claimed) {
        const notification = notificationById.get(row.notificationId);
        // The foreign key cascades, so a claimed row always has its notification. Guarded
        // only so a type cannot lie about it.
        if (notification === undefined) continue;
        const subscription =
          row.subscriptionId === null ? undefined : subscriptionById.get(row.subscriptionId);

        if (row.attempts > MAX_DELIVERY_ATTEMPTS) {
          // Only a row whose workers kept stopping mid-send gets here: a failed send gives up
          // on its own. Something about this row stops the process, so it must not go again.
          drop(row, notification.kind, 'attempts_exhausted', 'Abandoned by its workers too often');
        } else if (notification.expiresAt <= now) {
          drop(row, notification.kind, 'expired', 'Expired before it could be sent');
        } else if (subscription === undefined) {
          drop(
            row,
            notification.kind,
            'subscription_gone',
            'The device unsubscribed in the meantime',
          );
        } else {
          sendable.push({ row, notification, subscription });
        }
      }

      await forEachBounded(sendable, async ({ row, notification, subscription }) => {
        const startedAt = performance.now();
        const result: PushTransportResult = await sendPushToDevice(
          subscription,
          messageOf(notification),
          {
            logId: row.id,
            timeToLiveSeconds: Math.max(
              1,
              Math.ceil((notification.expiresAt.getTime() - now.getTime()) / 1000),
            ),
            urgent: isUrgentKind(notification.kind),
          },
        );
        recordPushSend(
          row.channel,
          notification.kind,
          result.outcome,
          (performance.now() - startedAt) / 1000,
        );

        switch (result.outcome) {
          case 'accepted': {
            summary.accepted++;
            // `sentAt` becomes the moment the push service took it, not when it was queued.
            settle(row.id, { status: 'SENT', sentAt: now });
            break;
          }
          case 'expired': {
            summary.expired++;
            expiredSubscriptionIds.push(subscription.id);
            settle(row.id, { status: 'FAILED', error: result.error ?? 'Subscription expired' });
            break;
          }
          case 'retry': {
            const error = result.error ?? 'Unknown error';
            errors.add(error);
            const nextAttemptAt = nextAttemptAfterFailure({
              attempts: row.attempts,
              now,
              expiresAt: notification.expiresAt,
              retryAfterSeconds: result.retryAfterSeconds,
              random: () => jitter,
            });
            if (nextAttemptAt === undefined) {
              summary.dropped++;
              recordPushDeliveriesDropped(
                notification.kind,
                row.attempts >= MAX_DELIVERY_ATTEMPTS ? 'attempts_exhausted' : 'expired',
                1,
              );
              settle(row.id, {
                status: 'FAILED',
                error: `Gave up after ${row.attempts} attempts: ${error}`,
              });
            } else {
              summary.retried++;
              settle(row.id, { status: 'PENDING', error, nextAttemptAt });
            }
            break;
          }
          case 'failed': {
            summary.failed++;
            const error = result.error ?? 'Unknown error';
            errors.add(error);
            settle(row.id, { status: 'FAILED', error });
            break;
          }
        }
      });

      await writeSettlements([...settlements.values()]);
      await pruneSubscriptions(expiredSubscriptionIds);
      await completeFinishedNotifications(notificationIds, now);

      const attributes = {
        'push.lane': lane,
        'push.claimed': claimed.length,
        'push.accepted': summary.accepted,
        'push.expired': summary.expired,
        'push.retried': summary.retried,
        'push.failed': summary.failed,
        'push.dropped': summary.dropped,
        ...(errors.size > 0 && { 'push.errors': [...errors].slice(0, MAX_LOGGED_ERRORS) }),
      };
      span.setAttributes(attributes);
      // Retries are the queue doing its job; a delivery given up on or refused for good is not.
      if (summary.failed > 0) {
        logger.error('Push deliveries failed', attributes);
      } else if (summary.dropped > 0) {
        logger.warn('Push deliveries given up', attributes);
      } else {
        logger.debug('Push batch delivered', attributes);
      }
      return summary;
    },
    { 'push.lane': lane },
  );
}

/**
 * Writes the outcome of a batch, one statement per distinct outcome. Only rows still PENDING
 * are touched: a fast device can report DELIVERED before the batch is written back.
 */
async function writeSettlements(settlements: Settlement[]): Promise<void> {
  for (const { ids, outcome } of settlements) {
    await prisma.pushNotificationLog.updateMany({
      where: { id: { in: ids }, status: 'PENDING' },
      /* eslint-disable unicorn/no-null -- Prisma clears a column only through null */
      data: {
        status: outcome.status,
        error: outcome.error ?? null,
        nextAttemptAt: outcome.nextAttemptAt ?? null,
        leaseUntil: null,
        ...(outcome.sentAt !== undefined && { sentAt: outcome.sentAt }),
      },
      /* eslint-enable unicorn/no-null */
    });
  }
}

/** Deletes the subscriptions of devices that unsubscribed, so no later push tries them again. */
async function pruneSubscriptions(subscriptionIds: string[]): Promise<void> {
  if (subscriptionIds.length === 0) return;
  try {
    const payload = await getPayload({ config });
    await payload.delete({
      collection: 'push-notification-subscriptions',
      where: { id: { in: subscriptionIds } },
      depth: 0,
    });
    // A device that unsubscribed is the normal end of a subscription, not a fault.
    logger.debug('Pruned expired push subscriptions', {
      'subscription.removed.count': subscriptionIds.length,
    });
  } catch (error: unknown) {
    logger.warn('Failed to prune expired push subscriptions', {
      error,
      'subscription.removed.count': subscriptionIds.length,
    });
  }
}

const countByStatus = (
  groups: readonly { status: string; _count: { _all: number } }[],
  status: string,
): number => groups.find((group) => group.status === status)?._count._all ?? 0;

/**
 * Marks every push of the batch whose last delivery just settled as complete, and reports how it
 * went. Both replicas can settle the last rows of one push at the same moment, so the conditional
 * update decides which of them reports.
 */
async function completeFinishedNotifications(notificationIds: string[], now: Date): Promise<void> {
  const stillPending = await prisma.pushNotificationLog.groupBy({
    by: ['notificationId'],
    where: { notificationId: { in: notificationIds }, status: 'PENDING' },
  });
  const pendingIds = new Set(stillPending.map((row) => row.notificationId));

  for (const notificationId of notificationIds) {
    if (pendingIds.has(notificationId)) continue;
    const { count } = await prisma.pushNotification.updateMany({
      // eslint-disable-next-line unicorn/no-null -- Prisma matches a SQL NULL only through null
      where: { id: notificationId, completedAt: null },
      data: { completedAt: now },
    });
    if (count === 0) continue;

    const [notification, outcomes] = await Promise.all([
      prisma.pushNotification.findUniqueOrThrow({
        where: { id: notificationId },
        select: { kind: true, createdAt: true, chatId: true, messageId: true },
      }),
      prisma.pushNotificationLog.groupBy({
        by: ['status'],
        where: { notificationId },
        _count: { _all: true },
      }),
    ]);
    const seconds = (now.getTime() - notification.createdAt.getTime()) / 1000;
    recordPushNotificationCompleted(notification.kind, seconds);
    logAtKindLevel(notification.kind, 'Push completed', {
      'push.kind': notification.kind,
      'push.notification_id': notificationId,
      'push.accepted': countByStatus(outcomes, 'SENT') + countByStatus(outcomes, 'DELIVERED'),
      'push.failed': countByStatus(outcomes, 'FAILED'),
      'push.duration_seconds': seconds,
      'chat.id': notification.chatId ?? undefined,
      'message.id': notification.messageId ?? undefined,
    });
  }
}
