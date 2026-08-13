import { hasAccessToThisUser, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import {
  recordSseEventDelivered,
  recordSseStreamClosed,
  recordSseStreamOpened,
  recordSseStreamRejected,
  type SseStreamOutcome,
} from '@/lib/chat-realtime-metrics';
import { chatPubSub, type ChatRealtimeEvent } from '@/lib/db/chat-pubsub';
import prisma from '@/lib/db/prisma';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { createLogger } from '@/utils/server-logger';
import { trace } from '@opentelemetry/api';
import { type NextRequest } from 'next/server';
import superjson from 'superjson';

const logger = createLogger('chat:sse');

/**
 * Cadence of the `heartbeat` frames that let a client detect a stream which is still
 * open but no longer delivering anything.
 */
const HEARTBEAT_INTERVAL_MS = 20_000;

/**
 * Reconnect interval handed to the client when the stream is closed because its
 * subscriptions could not be established.
 */
const SUBSCRIBE_FAILURE_RETRY_MS = 5000;

export async function GET(request: NextRequest): Promise<Response> {
  const session = await auth();
  const user = isValidNextAuthUser(session?.user) ? session.user : undefined;

  if (typeof user?.uuid !== 'string' || user.uuid === '') {
    recordSseStreamRejected('unauthorized');
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const chatIdsParameter = searchParams.get('chatIds');

  const rawChatIds =
    typeof chatIdsParameter === 'string' && chatIdsParameter.trim() !== ''
      ? chatIdsParameter
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : [];

  // Filter out user.uuid as they automatically subscribe to their own channel
  const chatIds = rawChatIds.filter((id) => id !== user.uuid);

  // Verify membership for all requested chats (admins bypass membership check)
  const isAdmin = hasAccessToThisUser({
    user: { group_ids: user.group_ids },
    requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam],
  });

  const containsAll = rawChatIds.includes('all');
  if (containsAll && !isAdmin) {
    recordSseStreamRejected('forbidden');
    logger.warn('Non-admin requested the all channel', { 'chat.user.id': user.uuid });
    return new Response('Forbidden: Non-admins cannot subscribe to the all channel', {
      status: 403,
    });
  }

  // Validate UUID format to prevent injection and invalid queries (except for 'all' channel)
  const validIdRegex =
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{24}|[a-z0-9_-]{1,64})$/i;
  for (const id of chatIds) {
    if (id === 'all') continue;
    if (!validIdRegex.test(id)) {
      recordSseStreamRejected('bad_request');
      return new Response(`Invalid chat ID format: ${id}`, { status: 400 });
    }
  }

  if (!isAdmin && chatIds.length > 0) {
    const memberships = await prisma.chatMembership.findMany({
      where: {
        userId: user.uuid,
        chatId: { in: chatIds },
      },
    });

    if (memberships.length !== chatIds.length) {
      recordSseStreamRejected('forbidden');
      logger.warn('Subscription requested for chats the user is not a member of', {
        'chat.user.id': user.uuid,
        requested: chatIds.length,
        allowed: memberships.length,
      });
      return new Response('Forbidden: You are not a member of all requested chats', {
        status: 403,
      });
    }
  }

  // The subscribed channels are the one thing that makes an SSE trace readable: the
  // span otherwise records only that "some stream" ran for a while.
  trace.getActiveSpan()?.setAttributes({
    'chat.user.id': user.uuid,
    'chat.sse.channel_count': chatIds.length + 1,
    'chat.sse.is_admin': isAdmin,
  });

  const encoder = new TextEncoder();
  let keepAliveInterval: NodeJS.Timeout | undefined = undefined;
  const activeListeners = new Map<string, () => void>();
  let unsubscribeConnectionRestored: (() => void) | undefined = undefined;
  let cleanedUp = false;
  const isCleanedUp = (): boolean => cleanedUp;

  const openedAt = Date.now();
  let deliveredEvents = 0;
  /** Overwritten by `failSubscription`; a stream that simply ends was closed by the client. */
  let closeOutcome: SseStreamOutcome = 'client_disconnect';

  const onAbort = (): void => {
    cleanup();
  };

  const cleanup = (): void => {
    if (cleanedUp) return;
    cleanedUp = true;
    request.signal.removeEventListener('abort', onAbort);
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
    unsubscribeConnectionRestored?.();
    unsubscribeConnectionRestored = undefined;
    for (const unsubscribe of activeListeners.values()) {
      unsubscribe();
    }
    activeListeners.clear();

    const durationSeconds = (Date.now() - openedAt) / 1000;
    recordSseStreamClosed(closeOutcome, durationSeconds);
    // Debug, not info: this fires for every navigation. The metric carries the signal;
    // the line is here for when a single user's session has to be reconstructed.
    logger.debug('Stream closed', {
      'chat.user.id': user.uuid,
      'chat.sse.outcome': closeOutcome,
      'chat.sse.duration_s': durationSeconds,
      'chat.sse.events_delivered': deliveredEvents,
    });
  };

  const stream = new ReadableStream({
    async start(controller: ReadableStreamDefaultController<Uint8Array>): Promise<void> {
      // Send initial handshake comment
      controller.enqueue(encoder.encode(':ok\n\n'));
      recordSseStreamOpened();

      const write = (frame: string): boolean => {
        try {
          controller.enqueue(encoder.encode(frame));
          return true;
        } catch {
          // Stream might be already closed, handled in cancel/abort
          cleanup();
          return false;
        }
      };

      // Named heartbeat rather than a `:keepalive` comment: comments keep the
      // connection warm but are invisible to `EventSource`, so a client cannot tell a
      // silently dead stream apart from a quiet one. Clients time out after three
      // missed beats; keep HEARTBEAT_INTERVAL_MS and that watchdog in sync.
      const sendHeartbeat = (): void => {
        write(`event: heartbeat\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`);
      };

      sendHeartbeat();
      keepAliveInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
      // The open request keeps the process alive on its own; the timer must not.
      keepAliveInterval.unref();

      const listener = (event: ChatRealtimeEvent): void => {
        try {
          const dataString = superjson.stringify(event);
          controller.enqueue(encoder.encode(`data: ${dataString}\n\n`));
          deliveredEvents += 1;
          recordSseEventDelivered(event.type);
        } catch (error) {
          logger.error('Failed to write event to stream controller', {
            error,
            'chat.user.id': user.uuid,
            'chat.event.type': event.type,
          });
          // A closed controller never recovers; releasing the subscriptions here keeps
          // the process from holding listeners for a stream nobody reads anymore.
          cleanup();
        }
      };

      // The Postgres LISTEN connection behind the pub/sub can be recycled while this
      // stream stays open. Nothing is replayed, so tell the client to refetch.
      const unsubscribeRestored = chatPubSub.onConnectionRestored((): void => {
        write('event: resync\ndata: {}\n\n');
      });
      if (isCleanedUp()) {
        unsubscribeRestored();
      } else {
        unsubscribeConnectionRestored = unsubscribeRestored;
      }

      /**
       * A stream whose subscriptions failed delivers nothing while still looking
       * perfectly healthy to the client - heartbeats keep arriving. Ending it instead
       * lets the browser reconnect (paced by the `retry` hint) once the pub/sub
       * backend is reachable again.
       */
      const failSubscription = (context: string, error: unknown): void => {
        closeOutcome = 'subscribe_failed';
        logger.error('Subscription failed, closing the stream so the client reconnects', {
          error,
          context,
          'chat.user.id': user.uuid,
        });
        write(`retry: ${SUBSCRIBE_FAILURE_RETRY_MS}\n\n`);
        cleanup();
        try {
          controller.close();
        } catch {
          // Already closed by the client going away.
        }
      };

      // Automatically subscribe to the user's personal channel (user.uuid) to receive direct updates
      try {
        const unsubscribeUser = await chatPubSub.subscribe(user.uuid, listener);
        if (isCleanedUp()) {
          unsubscribeUser();
        } else {
          activeListeners.set(user.uuid, unsubscribeUser);
        }
      } catch (error) {
        failSubscription(`Failed to subscribe to user channel ${user.uuid}`, error);
        return;
      }

      // Register subscriber for each chat channel
      for (const chatId of chatIds) {
        if (isCleanedUp()) break;

        try {
          const unsubscribe = await chatPubSub.subscribe(chatId, listener);

          // Guard against race conditions if client aborted during the await
          if (isCleanedUp()) {
            unsubscribe();
            break;
          }

          activeListeners.set(chatId, unsubscribe);
        } catch (error) {
          failSubscription(`Failed to subscribe to chat ${chatId}`, error);
          return;
        }
      }
    },

    // `cleanup` already records the close and logs it; cancelling is just one of the
    // ways a stream ends, not an event worth a line of its own.
    cancel(): void {
      cleanup();
    },
  });

  // Handle client abort gracefully
  if (request.signal.aborted) {
    cleanup();
  } else {
    request.signal.addEventListener('abort', onAbort, { once: true });
  }

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
