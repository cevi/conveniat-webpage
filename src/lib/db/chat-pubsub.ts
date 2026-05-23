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

class ChatPubSub {
  private emitter = new EventEmitter();
  private pgClient: pg.Client | undefined = undefined;
  private isListening = false;
  private connectingPromise: Promise<void> | undefined = undefined;

  constructor() {
    // Set to unlimited listeners to prevent memory leak warnings
    this.emitter.setMaxListeners(0);
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
              this.emitter.emit(`chat:${event.chatId}`, event);
              this.emitter.emit('chat:all', event);
            } catch (error) {
              console.error('[ChatPubSub] Failed to parse PG notification payload:', error);
            }
          }
        });

        client.on('error', (error: Error) => {
          console.error('[ChatPubSub] Dedicated PG client error:', error);

          // Explicitly close the errored client to release connection handles and event listeners
          try {
            client.end().catch((error_: unknown) => {
              console.error('[ChatPubSub] Error ending bad PG client:', error_);
            });
          } catch {
            // Ignore synchronous errors
          }

          if (this.pgClient === client) {
            this.pgClient = undefined;
          }

          this.isListening = false;
          this.connectingPromise = undefined;
          // Attempt reconnection after delay
          setTimeout(() => {
            this.ensureListening().catch((error_: unknown) => {
              console.error('[ChatPubSub] Reconnection attempt failed:', error_);
            });
          }, 5000);
        });

        this.pgClient = client;
        this.isListening = true;
        console.log('[ChatPubSub] Successfully listening to PG chat_events');
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
      event = possibleEvent;
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
