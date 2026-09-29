import type { PushNotificationChannel, PushNotificationKind } from '@/lib/prisma';
import { metrics, ValueType } from '@opentelemetry/api';

/**
 * OpenTelemetry instruments for push notifications, from the fan-out down to what the
 * devices report back.
 *
 * The push log rows in Postgres answer questions about one person. These answer the
 * questions about all of them: how many sends the push services turn away, how many
 * recipients have no device at all, and how many pushes a device ever confirms. They
 * are the only record of a chat fan-out, whose log line is debug and whose span is
 * sampled.
 *
 * Exported through the Prometheus exporter in `src/tracing.ts` (`:9464`). Attribute
 * values come from small fixed sets, never from chat ids or error messages.
 */
const meter = metrics.getMeter('push-notifications');

/** How one send to one device ended. */
export type PushSendOutcome =
  /** The push service accepted it. */
  | 'accepted'
  /** The device had unsubscribed; the subscription was pruned. */
  | 'expired'
  /** Anything else, including a send that never reached the push service. */
  | 'failed';

/** What a device reported about a push, see `pushTrackingRouter`. */
export type PushTrackingEvent = 'delivered' | 'suppressed' | 'click' | 'dismiss';

const sendCounter = meter.createCounter('push_sends_total', {
  description: 'Sends to a single device, by how the push service answered',
  valueType: ValueType.INT,
});

// The unit is part of the name on purpose, see `chat_sse_stream_duration_seconds`.
const sendDuration = meter.createHistogram('push_send_duration_seconds', {
  description: 'How long a single send took, including its log row, in seconds',
  valueType: ValueType.DOUBLE,
});

const recipientCounter = meter.createCounter('push_recipients_total', {
  description: 'People a fan-out was addressed to, by whether they had a push device',
  valueType: ValueType.INT,
});

const trackingCounter = meter.createCounter('push_tracking_events_total', {
  description: 'Delivery and interaction reports from devices',
  valueType: ValueType.INT,
});

/** A push log row predates the kind column when this is recorded as its kind. */
const UNKNOWN_KIND = 'unknown';

export const recordPushSend = (
  channel: PushNotificationChannel,
  kind: PushNotificationKind,
  outcome: PushSendOutcome,
  durationSeconds: number,
): void => {
  sendCounter.add(1, { channel, kind, outcome });
  sendDuration.record(durationSeconds, { channel, outcome });
};

export const recordPushRecipients = (
  kind: PushNotificationKind,
  withDevice: number,
  withoutDevice: number,
): void => {
  recipientCounter.add(withDevice, { kind, device: 'yes' });
  recipientCounter.add(withoutDevice, { kind, device: 'no' });
};

export const recordPushTrackingEvent = (
  event: PushTrackingEvent,
  channel: PushNotificationChannel,
  kind: PushNotificationKind | null,
): void => {
  trackingCounter.add(1, { event, channel, kind: kind ?? UNKNOWN_KIND });
};
