import { metrics, ValueType } from '@opentelemetry/api';

/**
 * OpenTelemetry instruments for the chat realtime path: the Postgres LISTEN/NOTIFY
 * pub/sub and the SSE streams it feeds.
 *
 * These exist because the failure that motivated them is invisible from the outside.
 * When the LISTEN connection dies, the process keeps serving SSE streams that stay
 * open and heartbeat normally while delivering nothing, every HTTP check stays green,
 * and the only symptom is that chat quietly stops moving. Request-level RED metrics
 * cannot see it, so the pub/sub has to report its own liveness.
 *
 * Everything here is exported through the Prometheus exporter in `src/tracing.ts`
 * (`:9464`), scraped per replica. Reading them **per instance** matters: one deaf
 * replica out of two looks like an intermittent fault to users but is unambiguous in
 * the data.
 *
 * Attribute values are deliberately drawn from small fixed sets — never raw error
 * messages — so that a failure loop cannot explode series cardinality.
 */
const meter = metrics.getMeter('chat-realtime');

/** Why a LISTEN connection was thrown away. */
export type PubSubRecycleReason = 'health_probe' | 'client_error';

/** How a connection attempt or notification ended. */
export type PubSubConnectionEvent = 'connected' | 'connect_failed' | 'recycled' | 'restored';

/** How a `pg_notify` publish ended. */
export type PubSubPublishOutcome = 'published' | 'oversized' | 'invalid' | 'error';

/** How an SSE stream ended. */
export type SseStreamOutcome =
  'client_disconnect' | 'subscribe_failed' | 'unauthorized' | 'forbidden' | 'bad_request';

/**
 * Whether this replica currently holds a working LISTEN connection.
 *
 * The single most important series here: `min_over_time(chat_pubsub_listening[5m]) == 0`
 * for any instance means that replica delivers no realtime events at all.
 */
let isListening = false;
/** Number of channel subscriptions currently registered on the emitter. */
let subscriberCount = 0;

export const setPubSubListening = (listening: boolean): void => {
  isListening = listening;
};

export const setPubSubSubscriberCount = (count: number): void => {
  subscriberCount = count;
};

meter
  .createObservableGauge('chat_pubsub_listening', {
    description: '1 if this replica holds a working Postgres LISTEN connection, else 0',
    valueType: ValueType.INT,
  })
  .addCallback((result) => {
    result.observe(isListening ? 1 : 0);
  });

meter
  .createObservableGauge('chat_pubsub_subscribers', {
    description: 'Channel subscriptions currently registered on this replica',
    valueType: ValueType.INT,
  })
  .addCallback((result) => {
    result.observe(subscriberCount);
  });

const pubsubConnectionCounter = meter.createCounter('chat_pubsub_connection_events_total', {
  description: 'Lifecycle transitions of the Postgres LISTEN connection',
  valueType: ValueType.INT,
});

/**
 * Notifications this replica received from Postgres.
 *
 * `pg_notify` fans out to every listening session, so on a healthy cluster this
 * increases on *all* replicas whenever any of them publishes. A replica whose count
 * flatlines while `chat_pubsub_publish_total` keeps rising elsewhere has gone deaf —
 * which is exactly the failure this instrumentation was written for.
 */
const pubsubNotificationCounter = meter.createCounter('chat_pubsub_notifications_total', {
  description: 'Notifications received on the chat_events channel',
  valueType: ValueType.INT,
});

const pubsubPublishCounter = meter.createCounter('chat_pubsub_publish_total', {
  description: 'Events this replica published via pg_notify',
  valueType: ValueType.INT,
});

const sseStreamsActive = meter.createUpDownCounter('chat_sse_streams_active', {
  description: 'SSE chat streams currently open on this replica',
  valueType: ValueType.INT,
});

const sseStreamCounter = meter.createCounter('chat_sse_streams_total', {
  description: 'SSE chat streams opened, by how they ended',
  valueType: ValueType.INT,
});

const sseStreamDuration = meter.createHistogram('chat_sse_stream_duration_seconds', {
  description: 'How long SSE chat streams stayed open',
  unit: 's',
  valueType: ValueType.DOUBLE,
});

const sseEventCounter = meter.createCounter('chat_sse_events_delivered_total', {
  description: 'Realtime events written to an SSE stream',
  valueType: ValueType.INT,
});

export const recordPubSubConnectionEvent = (
  event: PubSubConnectionEvent,
  reason?: PubSubRecycleReason,
): void => {
  pubsubConnectionCounter.add(1, reason === undefined ? { event } : { event, reason });
};

export const recordPubSubNotification = (outcome: 'delivered' | 'parse_error'): void => {
  pubsubNotificationCounter.add(1, { outcome });
};

export const recordPubSubPublish = (outcome: PubSubPublishOutcome): void => {
  pubsubPublishCounter.add(1, { outcome });
};

export const recordSseStreamOpened = (): void => {
  sseStreamsActive.add(1);
};

export const recordSseStreamClosed = (outcome: SseStreamOutcome, durationSeconds: number): void => {
  sseStreamsActive.add(-1);
  sseStreamCounter.add(1, { outcome });
  sseStreamDuration.record(durationSeconds, { outcome });
};

/** A stream rejected before it ever opened, so there is nothing to decrement. */
export const recordSseStreamRejected = (outcome: SseStreamOutcome): void => {
  sseStreamCounter.add(1, { outcome });
};

export const recordSseEventDelivered = (type: string): void => {
  sseEventCounter.add(1, { type });
};
