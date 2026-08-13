/* eslint-disable unicorn/prefer-event-target */
import { environmentVariables } from '@/config/environment-variables';
import {
  recordPubSubConnectionEvent,
  recordPubSubNotification,
  recordPubSubPublish,
  setPubSubListening,
  setPubSubSubscriberCount,
  type PubSubRecycleReason,
} from '@/lib/chat-realtime-metrics';
import prisma from '@/lib/db/prisma';
import { createLogger } from '@/utils/server-logger';
import { withSpan } from '@/utils/tracing-helpers';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import EventEmitter from 'node:events';
import pg from 'pg';

const logger = createLogger('chat:pubsub');

const isBuild =
  // eslint-disable-next-line n/no-process-env
  process.env['NEXT_PHASE'] === PHASE_PRODUCTION_BUILD ||
  // eslint-disable-next-line n/no-process-env
  process.env['NEXT_PHASE'] === 'phase-production-build';

export interface ChatRealtimeEvent {
  type: 'new_message' | 'message_updated' | 'chat_read_by_admin' | 'chat_updated' | 'new_chat';
  chatId: string;
  senderId: string;
  /**
   * Delivery channel override. Defaults to `chatId`. Set to a user uuid to
   * deliver the event on that user's personal channel — used for events about
   * chats the recipient's connection is not (yet) subscribed to, e.g. a
   * `new_chat` announcement after being added to a chat.
   */
  channel?: string;
  message?: {
    id: string;
    createdAt: Date;
    messagePayload: unknown;
    senderId: string | undefined;
    senderName?: string;
    status: string;
    type: string;
    parentId?: string | undefined;
  };
  chat?: {
    status: string;
    capabilities: string[];
  };
}

/** How often the LISTEN connection is probed with a round-trip query. */
const HEALTH_PROBE_INTERVAL_MS = 30_000;
/** A probe that does not answer within this window counts as a dead connection. */
const HEALTH_PROBE_TIMEOUT_MS = 10_000;
/** Delay before a recycled LISTEN connection is re-established. */
const RECONNECT_DELAY_MS = 5000;

class ChatPubSub {
  private emitter = new EventEmitter();
  private pgClient: pg.Client | undefined = undefined;
  private isListening = false;
  private connectingPromise: Promise<void> | undefined = undefined;
  private healthProbeInterval: NodeJS.Timeout | undefined = undefined;
  private reconnectTimer: NodeJS.Timeout | undefined = undefined;
  private connectionListeners = new Set<() => void>();
  /** Set when a LISTEN connection is dropped, so the next successful connect can announce the gap. */
  private missedEventsDuringOutage = false;

  constructor() {
    // Set to unlimited listeners to prevent memory leak warnings
    this.emitter.setMaxListeners(0);
  }

  /**
   * Registers a callback that fires once the LISTEN connection has been
   * re-established after an outage. Notifications published during the outage are
   * lost, so subscribers have to treat this as "your view may be stale".
   *
   * @returns an unsubscribe function
   */
  public onConnectionRestored(listener: () => void): () => void {
    this.connectionListeners.add(listener);
    return (): void => {
      this.connectionListeners.delete(listener);
    };
  }

  private notifyConnectionRestored(): void {
    for (const listener of this.connectionListeners) {
      try {
        listener();
      } catch (error) {
        logger.error('Connection-restored listener failed', { error });
      }
    }
  }

  /**
   * Republishes the emitter's subscription count as a gauge. Called wherever a
   * subscription is added or removed, so the metric cannot drift from reality.
   */
  private reportSubscriberCount(): void {
    const total = this.emitter
      .eventNames()
      .reduce((sum, name) => sum + this.emitter.listenerCount(name as string), 0);
    setPubSubSubscriberCount(total);
  }

  private stopHealthProbe(): void {
    if (this.healthProbeInterval) {
      clearInterval(this.healthProbeInterval);
      this.healthProbeInterval = undefined;
    }
  }

  /**
   * A LISTEN connection can go half-open - an idle NAT mapping expiring, a peer
   * disappearing without an RST - without `pg` ever emitting `error`. `isListening`
   * then stays true while no notification ever arrives again, and every SSE stream in
   * this process goes quiet until a restart. Only a round-trip query detects that.
   */
  private startHealthProbe(client: pg.Client): void {
    this.stopHealthProbe();

    this.healthProbeInterval = setInterval((): void => {
      let timeoutHandle: NodeJS.Timeout | undefined = undefined;
      const timeout = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(
          () => reject(new Error('health probe timed out')),
          HEALTH_PROBE_TIMEOUT_MS,
        );
      });

      Promise.race([client.query('SELECT 1'), timeout])
        .catch((error: unknown) => {
          this.recycleClient(client, 'health_probe', error);
        })
        .finally(() => {
          if (timeoutHandle) clearTimeout(timeoutHandle);
        });
    }, HEALTH_PROBE_INTERVAL_MS);

    this.healthProbeInterval.unref();
  }

  /**
   * Tears down a LISTEN connection that can no longer be trusted and schedules a
   * fresh one. Safe to call for a client that has already been replaced.
   */
  private recycleClient(client: pg.Client, reason: PubSubRecycleReason, cause: unknown): void {
    // Error level on purpose: every SSE stream on this replica stops receiving
    // events until the replacement connection is up.
    logger.error('Recycling PG LISTEN connection', { reason, error: cause });
    recordPubSubConnectionEvent('recycled', reason);

    if (this.pgClient === client) {
      this.stopHealthProbe();
      this.pgClient = undefined;
      this.isListening = false;
      setPubSubListening(false);
      this.connectingPromise = undefined;
      this.missedEventsDuringOutage = true;
    }

    // Explicitly close the client to release connection handles and event listeners
    client.end().catch((error: unknown) => {
      logger.error('Error ending bad PG client', { error });
    });

    this.scheduleReconnect();
  }

  /**
   * Keeps retrying until a LISTEN connection is back. Giving up after a single
   * attempt would leave every open SSE stream permanently detached from Postgres
   * whenever an outage outlasts that one retry.
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer !== undefined) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.ensureListening().catch((error: unknown) => {
        logger.error('Reconnection attempt failed, will retry', {
          error,
          retryInMs: RECONNECT_DELAY_MS,
        });
        this.scheduleReconnect();
      });
    }, RECONNECT_DELAY_MS);

    this.reconnectTimer.unref();
  }

  private async ensureListening(): Promise<void> {
    if (isBuild) return;
    if (this.isListening) return;

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    this.connectingPromise = withSpan('chat.pubsub.connect', async (): Promise<void> => {
      // Kept outside the try so a half-initialized client can still be closed below.
      let pendingClient: pg.Client | undefined = undefined;
      try {
        const client = new pg.Client({
          connectionString: environmentVariables.CHAT_DATABASE_URL,
          keepAlive: true,
          keepAliveInitialDelayMillis: 30_000,
        });
        pendingClient = client;

        await client.connect();
        await client.query('LISTEN chat_events');

        client.on('notification', (message) => {
          if (message.channel === 'chat_events' && typeof message.payload === 'string') {
            try {
              const event = JSON.parse(message.payload) as ChatRealtimeEvent;
              // Parse date correctly if present
              if (event.message && typeof event.message.createdAt === 'string') {
                event.message.createdAt = new Date(event.message.createdAt);
              }
              const channel = event.channel ?? event.chatId;
              recordPubSubNotification('delivered');
              logger.debug('Notification received', {
                'chat.event.type': event.type,
                'chat.channel': channel,
              });
              this.emitter.emit(`chat:${channel}`, event);
              this.emitter.emit('chat:all', event);
            } catch (error) {
              recordPubSubNotification('parse_error');
              logger.error('Failed to parse PG notification payload', { error });
            }
          }
        });

        client.on('error', (error: Error) => {
          this.recycleClient(client, 'client_error', error);
        });

        this.pgClient = client;
        this.isListening = true;
        setPubSubListening(true);
        this.startHealthProbe(client);
        recordPubSubConnectionEvent('connected');
        logger.info('Listening to PG chat_events');

        if (this.missedEventsDuringOutage) {
          this.missedEventsDuringOutage = false;
          recordPubSubConnectionEvent('restored');
          logger.warn('LISTEN connection restored after an outage, events were missed');
          this.notifyConnectionRestored();
        }
      } catch (error) {
        recordPubSubConnectionEvent('connect_failed');
        logger.error('Failed to start PG LISTEN connection', { error });

        // A client that connected before `LISTEN` failed still holds a backend
        // session, and its `error` handler is only attached after the LISTEN - an
        // orphan emits `error` with no listener once its socket dies, which takes
        // the process down. `scheduleReconnect` retries every few seconds, so each
        // failed attempt would arm another one. `end()` is a no-op if the client
        // never connected. Skipped once the client is installed as `pgClient`, so
        // a late failure cannot tear down a connection that is already listening.
        if (this.pgClient !== pendingClient) {
          await pendingClient?.end().catch((endError: unknown) => {
            logger.error('Error ending partially initialized PG client', { error: endError });
          });
        }

        this.connectingPromise = undefined;
        throw error;
      }
    });

    return this.connectingPromise;
  }

  public async publish(
    chatIdOrEvent: string | ChatRealtimeEvent,
    possibleEvent?: ChatRealtimeEvent,
  ): Promise<void> {
    if (isBuild) return;

    let event: ChatRealtimeEvent | undefined;
    if (typeof chatIdOrEvent === 'string') {
      if (!possibleEvent) {
        recordPubSubPublish('invalid');
        logger.error('publish called with string but missing event object');
        return;
      }
      // The string form addresses a specific channel (e.g. a user's personal
      // channel). Record it on the event so the LISTEN side emits it there
      // instead of on the chat's channel.
      event =
        chatIdOrEvent === possibleEvent.chatId
          ? possibleEvent
          : { ...possibleEvent, channel: chatIdOrEvent };
    } else {
      event = chatIdOrEvent;
    }

    const runtimeEvent = event as unknown;
    if (runtimeEvent === undefined || runtimeEvent === null) {
      recordPubSubPublish('invalid');
      logger.error('publish called with undefined event');
      return;
    }

    const publishedEvent = event;
    const payload = JSON.stringify(publishedEvent);
    const payloadBytes = Buffer.byteLength(payload, 'utf8');
    const channel = publishedEvent.channel ?? publishedEvent.chatId;

    // Safety check for pg_notify payload size (Postgres limit is 8000 bytes)
    if (payloadBytes > 7900) {
      recordPubSubPublish('oversized');
      logger.warn('Notification payload exceeds the pg_notify limit, event not published', {
        'chat.event.type': publishedEvent.type,
        'chat.channel': channel,
        payloadBytes,
      });
      return;
    }

    // Traced so that a message send can be followed from the mutation through to the
    // notify that fans it out; a publish that never happened is otherwise invisible.
    await withSpan(
      'chat.pubsub.publish',
      async (span): Promise<void> => {
        try {
          await prisma.$executeRaw`SELECT pg_notify('chat_events', ${payload})`;
          recordPubSubPublish('published');
          span.setAttribute('chat.publish.ok', true);
        } catch (error) {
          recordPubSubPublish('error');
          span.setAttribute('chat.publish.ok', false);
          logger.error('Failed to execute pg_notify', {
            error,
            'chat.event.type': publishedEvent.type,
            'chat.channel': channel,
          });
        }
      },
      {
        'chat.event.type': publishedEvent.type,
        'chat.channel': channel,
        'chat.payload.bytes': payloadBytes,
      },
    );
  }

  public async subscribe(
    chatId: string,
    callback: (event: ChatRealtimeEvent) => void,
  ): Promise<() => void> {
    if (isBuild) return () => {};
    await this.ensureListening();
    this.emitter.on(`chat:${chatId}`, callback);
    this.reportSubscriberCount();
    return () => {
      this.emitter.off(`chat:${chatId}`, callback);
      this.reportSubscriberCount();
    };
  }

  public async close(): Promise<void> {
    this.stopHealthProbe();
    if (this.reconnectTimer !== undefined) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.pgClient) {
      try {
        await this.pgClient.end();
      } catch (error) {
        logger.error('Error closing PG connection', { error });
      }
      this.pgClient = undefined;
      this.isListening = false;
      setPubSubListening(false);
      this.connectingPromise = undefined;
    }
  }
}

// Singleton handling to prevent multiple connections during fast-refresh
const globalForChatPubSub = globalThis as unknown as {
  chatPubSub?: ChatPubSub;
};

export const chatPubSub = globalForChatPubSub.chatPubSub ?? new ChatPubSub();

// During development, Next.js fast-refresh / HMR will re-evaluate modules frequently,
// which would result in multiple redundant ChatPubSub instances. By saving the instance
// to globalThis, we preserve the active listening client across module re-evaluations.
// In production, the standard Node.js module caching system guarantees a single process-level
// singleton, so we do not pollute the global scope.
if (environmentVariables.NODE_ENV !== 'production') {
  globalForChatPubSub.chatPubSub = chatPubSub;
}
