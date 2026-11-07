import type { RealtimeOpenReason } from '@/lib/chat-shared';
import {
  defineCounter,
  defineHistogram,
  defineObservableGauges,
  defineUpDownCounter,
} from '@/lib/telemetry/metrics';

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
const SCOPE = 'chat-realtime';

/** Why a LISTEN connection was thrown away. */
export type PubSubRecycleReason = 'health_probe' | 'client_error';

/** How a connection attempt or notification ended. */
export type PubSubConnectionEvent = 'connected' | 'connect_failed' | 'recycled' | 'restored';

/** How a `pg_notify` publish ended. */
export type PubSubPublishOutcome = 'published' | 'oversized' | 'invalid' | 'error';

/** How an SSE stream ended. */
export type SseStreamOutcome =
  'client_disconnect' | 'subscribe_failed' | 'unauthorized' | 'forbidden' | 'bad_request';

/** How an SSE stream's subscriptions ended: all set up, one failed, or the client left first. */
export type SseSubscribeOutcome = 'ok' | 'failed' | 'aborted';

/**
 * Why an SSE stream was opened: the reason the client sent, `browser_retry` for a
 * reconnect the browser made on its own, and `unknown` for a client that sends none, such
 * as a bundle from before the parameter existed.
 */
export type SseOpenReason = RealtimeOpenReason | 'browser_retry' | 'unknown';

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

defineObservableGauges({
  scope: SCOPE,
  gauges: {
    listening: {
      name: 'chat_pubsub_listening',
      description: '1 if this replica holds a working Postgres LISTEN connection, else 0',
      valueType: 'int',
    },
    subscribers: {
      name: 'chat_pubsub_subscribers',
      description: 'Channel subscriptions currently registered on this replica',
      valueType: 'int',
    },
  },
  observe: (observe): void => {
    observe('listening', isListening ? 1 : 0);
    observe('subscribers', subscriberCount);
  },
});

const pubsubConnectionCounter = defineCounter<{
  event: PubSubConnectionEvent;
  reason?: PubSubRecycleReason;
}>({
  scope: SCOPE,
  name: 'chat_pubsub_connection_events_total',
  description: 'Lifecycle transitions of the Postgres LISTEN connection',
});

/**
 * Notifications this replica received from Postgres.
 *
 * `pg_notify` fans out to every listening session, so on a healthy cluster this
 * increases on *all* replicas whenever any of them publishes. A replica whose count
 * flatlines while `chat_pubsub_publish_total` keeps rising elsewhere has gone deaf —
 * which is exactly the failure this instrumentation was written for.
 */
const pubsubNotificationCounter = defineCounter<{ outcome: 'delivered' | 'parse_error' }>({
  scope: SCOPE,
  name: 'chat_pubsub_notifications_total',
  description: 'Notifications received on the chat_events channel',
});

const pubsubPublishCounter = defineCounter<{ outcome: PubSubPublishOutcome }>({
  scope: SCOPE,
  name: 'chat_pubsub_publish_total',
  description: 'Events this replica published via pg_notify',
});

const sseStreamsActive = defineUpDownCounter({
  scope: SCOPE,
  name: 'chat_sse_streams_active',
  description: 'SSE chat streams currently open on this replica',
});

const sseStreamCounter = defineCounter<{ outcome: SseStreamOutcome }>({
  scope: SCOPE,
  name: 'chat_sse_streams_total',
  description: 'SSE chat streams opened, by how they ended',
});

const sseStreamDuration = defineHistogram<{ outcome: SseStreamOutcome }>({
  scope: SCOPE,
  name: 'chat_sse_stream_duration_seconds',
  description: 'How long SSE chat streams stayed open, in seconds',
  // The SDK's default boundaries, kept so the series continue. Meant for milliseconds, they
  // happen to fit a stream that lives from seconds to hours.
  buckets: [0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 10_000],
});

const sseStreamOpenedCounter = defineCounter<{ reason: SseOpenReason }>({
  scope: SCOPE,
  name: 'chat_sse_streams_opened_total',
  description: 'SSE chat streams opened, by why the client opened them',
});

const sseEventCounter = defineCounter<{ type: string }>({
  scope: SCOPE,
  name: 'chat_sse_events_delivered_total',
  description: 'Realtime events written to an SSE stream',
});

/** Buckets for the realtime path, which answers in milliseconds when it is well. */
const REALTIME_BUCKETS_SECONDS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

// Measured against the publishing replica's clock. The replicas run NTP, so the skew is a
// few milliseconds, well below the delays this is meant to catch.
const sseDeliveryLag = defineHistogram<{ type: string }>({
  scope: SCOPE,
  name: 'chat_sse_delivery_lag_seconds',
  description: 'Time from publishing a realtime event to writing it to an SSE stream, in seconds',
  buckets: REALTIME_BUCKETS_SECONDS,
});

// The awaits on the pub/sub run after the route handler returned, so no span covers them.
// A slow LISTEN connect shows up here and nowhere else.
const sseSubscribeDuration = defineHistogram<{ outcome: SseSubscribeOutcome }>({
  scope: SCOPE,
  name: 'chat_sse_subscribe_duration_seconds',
  description:
    'Time an SSE stream took to subscribe to its channels, in seconds, by how the setup ended',
  buckets: REALTIME_BUCKETS_SECONDS,
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

export const recordSseStreamOpened = (reason: SseOpenReason): void => {
  sseStreamsActive.add(1);
  sseStreamOpenedCounter.add(1, { reason });
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

/**
 * Counts an event written to a stream. `publishedAt` is the publisher's timestamp; an
 * event without one, a `resync` frame or one from a replica that predates the field,
 * is counted without a lag.
 */
export const recordSseEventDelivered = (type: string, publishedAt?: number): void => {
  sseEventCounter.add(1, { type });
  if (typeof publishedAt === 'number' && Number.isFinite(publishedAt)) {
    sseDeliveryLag.record(Math.max(0, Date.now() - publishedAt) / 1000, { type });
  }
};

export const recordSseSubscribeDuration = (
  durationSeconds: number,
  outcome: SseSubscribeOutcome,
): void => {
  sseSubscribeDuration.record(durationSeconds, { outcome });
};
