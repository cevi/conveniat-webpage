/* eslint-disable unicorn/prefer-event-target */
import { environmentVariables } from '@/config/environment-variables';
import prisma from '@/lib/db/prisma';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import EventEmitter from 'node:events';
import pg from 'pg';

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
        console.error('[ChatPubSub] Connection-restored listener failed:', error);
      }
    }
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
          this.recycleClient(client, `health probe failed: ${String(error)}`);
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
  private recycleClient(client: pg.Client, reason: string): void {
    console.error(`[ChatPubSub] Recycling PG LISTEN connection (${reason})`);

    if (this.pgClient === client) {
      this.stopHealthProbe();
      this.pgClient = undefined;
      this.isListening = false;
      this.connectingPromise = undefined;
      this.missedEventsDuringOutage = true;
    }

    // Explicitly close the client to release connection handles and event listeners
    client.end().catch((error: unknown) => {
      console.error('[ChatPubSub] Error ending bad PG client:', error);
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
        console.error('[ChatPubSub] Reconnection attempt failed:', error);
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

    this.connectingPromise = (async (): Promise<void> => {
      try {
        const client = new pg.Client({
          connectionString: environmentVariables.CHAT_DATABASE_URL,
          keepAlive: true,
          keepAliveInitialDelayMillis: 30_000,
        });

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
              this.emitter.emit(`chat:${event.channel ?? event.chatId}`, event);
              this.emitter.emit('chat:all', event);
            } catch (error) {
              console.error('[ChatPubSub] Failed to parse PG notification payload:', error);
            }
          }
        });

        client.on('error', (error: Error) => {
          this.recycleClient(client, `client error: ${error.message}`);
        });

        this.pgClient = client;
        this.isListening = true;
        this.startHealthProbe(client);
        console.log('[ChatPubSub] Successfully listening to PG chat_events');

        if (this.missedEventsDuringOutage) {
          this.missedEventsDuringOutage = false;
          this.notifyConnectionRestored();
        }
      } catch (error) {
        console.error('[ChatPubSub] Failed to start PG LISTEN connection:', error);
        this.connectingPromise = undefined;
        throw error;
      }
    })();

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
        console.error('[ChatPubSub] publish called with string but missing event object');
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
      console.error('[ChatPubSub] publish called with undefined event');
      return;
    }

    const payload = JSON.stringify(event);

    // Safety check for pg_notify payload size (Postgres limit is 8000 bytes)
    if (Buffer.byteLength(payload, 'utf8') > 7900) {
      console.warn(
        `[ChatPubSub] Notification payload size exceeds 8KB limit. Event will not be published:`,
        event,
      );
      return;
    }

    try {
      await prisma.$executeRaw`SELECT pg_notify('chat_events', ${payload})`;
    } catch (error) {
      console.error('[ChatPubSub] Failed to execute pg_notify:', error);
    }
  }

  public async subscribe(
    chatId: string,
    callback: (event: ChatRealtimeEvent) => void,
  ): Promise<() => void> {
    if (isBuild) return () => {};
    await this.ensureListening();
    this.emitter.on(`chat:${chatId}`, callback);
    return () => {
      this.emitter.off(`chat:${chatId}`, callback);
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
        console.error('[ChatPubSub] Error closing PG connection:', error);
      }
      this.pgClient = undefined;
      this.isListening = false;
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
