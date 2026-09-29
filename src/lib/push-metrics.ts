import type { PushNotificationChannel, PushNotificationKind } from '@/lib/prisma';
import type { Counter, Histogram, Meter, ObservableGauge } from '@opentelemetry/api';
import { metrics, ValueType } from '@opentelemetry/api';

/**
 * OpenTelemetry instruments for push notifications, from the fan-out down to what the
 * devices report back.
 *
 * The push log rows in Postgres answer questions about one person. These answer the
 * questions about all of them: how many sends the push services turn away, how many
 * recipients have no device at all, how long a push takes to reach every device, and
 * whether the delivery queue keeps up. They are the only record of a chat fan-out, whose
 * log line is debug and whose span is sampled.
 *
 * Exported through the Prometheus exporter in `src/tracing.ts` (`:9464`). Attribute
 * values come from small fixed sets, never from chat ids or error messages.
 *
 * Every instrument is created on first use. `payload.config.ts` imports this module through
 * the announcements collection while the SDK is still starting, and `metrics.getMeter()`
 * binds to whatever provider is registered at that moment: taken at module scope, it got the
 * no-op provider and every series here was dropped. See `startRuntimeMetrics` in
 * `src/tracing.ts`.
 */
let meter: Meter | undefined;
const getMeter = (): Meter => (meter ??= metrics.getMeter('push-notifications'));

const lazy = <T>(create: (meter: Meter) => T): (() => T) => {
  let instrument: T | undefined;
  return (): T => (instrument ??= create(getMeter()));
};

/** How one send to one device ended. */
export type PushSendOutcome =
  /** The push service accepted it. */
  | 'accepted'
  /** The device had unsubscribed; the subscription was pruned. */
  | 'expired'
  /** The push service could not take it now; the delivery is tried again later. */
  | 'retry'
  /** Anything else, including a send that never reached the push service. */
  | 'failed';

/** What a device reported about a push, see `pushTrackingRouter`. */
export type PushTrackingEvent = 'delivered' | 'suppressed' | 'click' | 'dismiss';

/** Why the queue gave up on a delivery without the push service having the last word. */
export type PushDropReason =
  /** The push expired before the queue got to it. */
  | 'expired'
  /** It kept failing until it ran out of attempts. */
  | 'attempts_exhausted'
  /** Its subscription was deleted while it waited. */
  | 'subscription_gone';

const sendCounter = lazy<Counter>((m) =>
  m.createCounter('push_sends_total', {
    description: 'Sends to a single device, by how the push service answered',
    valueType: ValueType.INT,
  }),
);

// The unit is part of the name on purpose, see `chat_sse_stream_duration_seconds`.
const sendDuration = lazy<Histogram>((m) =>
  m.createHistogram('push_send_duration_seconds', {
    description: 'How long a single send to a push service took, in seconds',
    valueType: ValueType.DOUBLE,
    // The default boundaries start at 5 s, which would put every healthy send in one bucket.
    advice: { explicitBucketBoundaries: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] },
  }),
);

const recipientCounter = lazy<Counter>((m) =>
  m.createCounter('push_recipients_total', {
    description: 'People a fan-out was addressed to, by whether they had a push device',
    valueType: ValueType.INT,
  }),
);

const trackingCounter = lazy<Counter>((m) =>
  m.createCounter('push_tracking_events_total', {
    description: 'Delivery and interaction reports from devices',
    valueType: ValueType.INT,
  }),
);

const enqueuedCounter = lazy<Counter>((m) =>
  m.createCounter('push_deliveries_enqueued_total', {
    description: 'Deliveries put on the queue, one per device of every recipient',
    valueType: ValueType.INT,
  }),
);

const droppedCounter = lazy<Counter>((m) =>
  m.createCounter('push_deliveries_dropped_total', {
    description: 'Deliveries the queue gave up on, by why',
    valueType: ValueType.INT,
  }),
);

const completionDuration = lazy<Histogram>((m) =>
  m.createHistogram('push_notification_completion_seconds', {
    description: 'From queuing a push to the last of its deliveries being settled, in seconds',
    valueType: ValueType.DOUBLE,
    advice: {
      explicitBucketBoundaries: [1, 2.5, 5, 10, 30, 60, 120, 300, 900, 3600, 21_600, 86_400],
    },
  }),
);

/** A push log row predates the kind column when this is recorded as its kind. */
const UNKNOWN_KIND = 'unknown';

export const recordPushSend = (
  channel: PushNotificationChannel,
  kind: PushNotificationKind,
  outcome: PushSendOutcome,
  durationSeconds: number,
): void => {
  sendCounter().add(1, { channel, kind, outcome });
  sendDuration().record(durationSeconds, { channel, outcome });
};

export const recordPushRecipients = (
  kind: PushNotificationKind,
  withDevice: number,
  withoutDevice: number,
): void => {
  recipientCounter().add(withDevice, { kind, device: 'yes' });
  recipientCounter().add(withoutDevice, { kind, device: 'no' });
};

export const recordPushTrackingEvent = (
  event: PushTrackingEvent,
  channel: PushNotificationChannel,
  kind: PushNotificationKind | null,
): void => {
  trackingCounter().add(1, { event, channel, kind: kind ?? UNKNOWN_KIND });
};

export const recordPushDeliveriesEnqueued = (kind: PushNotificationKind, count: number): void => {
  enqueuedCounter().add(count, { kind });
};

export const recordPushDeliveriesDropped = (
  kind: PushNotificationKind,
  reason: PushDropReason,
  count: number,
): void => {
  if (count > 0) droppedCounter().add(count, { kind, reason });
};

export const recordPushNotificationCompleted = (
  kind: PushNotificationKind,
  durationSeconds: number,
): void => {
  completionDuration().record(durationSeconds, { kind });
};

/** Where the PENDING deliveries of the queue stand right now. */
export interface PushQueueSnapshot {
  /** Ready to be sent and waiting for a worker. */
  due: number;
  /** Claimed by a worker that has not reported back yet. */
  inFlight: number;
  /** Waiting for their next attempt after a failure. */
  scheduled: number;
  /** How long the oldest due delivery has been waiting, 0 when none is. */
  oldestDueSeconds: number;
}

let queueGauges: [ObservableGauge, ObservableGauge] | undefined;

/**
 * Reports the queue backlog on every scrape, read by `readSnapshot`. Registered once per
 * process; later calls do nothing.
 *
 * Every replica reads the same table and reports the same numbers, so a dashboard takes the
 * `max` across instances, not the sum.
 */
export const registerPushQueueGauges = (readSnapshot: () => Promise<PushQueueSnapshot>): void => {
  if (queueGauges !== undefined) return;
  const m = getMeter();
  const deliveries = m.createObservableGauge('push_queue_deliveries', {
    description: 'PENDING deliveries on the push queue, by state',
    valueType: ValueType.INT,
  });
  const oldestDue = m.createObservableGauge('push_queue_oldest_due_seconds', {
    description: 'How long the oldest due delivery has waited for a worker, in seconds',
    valueType: ValueType.DOUBLE,
  });
  queueGauges = [deliveries, oldestDue];

  m.addBatchObservableCallback(async (result) => {
    let snapshot: PushQueueSnapshot;
    try {
      snapshot = await readSnapshot();
    } catch {
      // A failed read reports nothing rather than zeros, so a dead database does not look
      // like an empty queue.
      return;
    }
    result.observe(deliveries, snapshot.due, { state: 'due' });
    result.observe(deliveries, snapshot.inFlight, { state: 'in_flight' });
    result.observe(deliveries, snapshot.scheduled, { state: 'scheduled' });
    result.observe(oldestDue, snapshot.oldestDueSeconds);
  }, queueGauges);
};
