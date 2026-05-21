import { hasAccessToThisUser, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { chatPubSub, type ChatRealtimeEvent } from '@/lib/db/chat-pubsub';
import prisma from '@/lib/db/prisma';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { type NextRequest } from 'next/server';
import superjson from 'superjson';

export async function GET(request: NextRequest): Promise<Response> {
  const session = await auth();
  const user = isValidNextAuthUser(session?.user) ? session.user : undefined;

  if (!user?.uuid) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const chatIdsParameter = searchParams.get('chatIds');

  if (!chatIdsParameter) {
    return new Response('Missing chatIds parameter', { status: 400 });
  }

  const chatIds = chatIdsParameter
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (chatIds.length === 0) {
    return new Response('No valid chat IDs provided', { status: 400 });
  }

  // Verify membership for all requested chats (admins bypass membership check)
  const isAdmin = hasAccessToThisUser({
    user: { group_ids: user.group_ids },
    requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam],
  });

  const containsAll = chatIds.includes('all');
  if (containsAll && !isAdmin) {
    return new Response('Forbidden: Non-admins cannot subscribe to the all channel', {
      status: 403,
    });
  }

  // Validate UUID format to prevent injection and invalid queries (except for 'all' channel)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const id of chatIds) {
    if (id === 'all') continue;
    if (!uuidRegex.test(id)) {
      return new Response(`Invalid chat ID format: ${id}`, { status: 400 });
    }
  }

  if (!isAdmin) {
    const memberships = await prisma.chatMembership.findMany({
      where: {
        userId: user.uuid,
        chatId: { in: chatIds },
      },
    });

    if (memberships.length !== chatIds.length) {
      return new Response('Forbidden: You are not a member of all requested chats', {
        status: 403,
      });
    }
  }

  const encoder = new TextEncoder();
  let keepAliveInterval: NodeJS.Timeout | undefined = undefined;
  const activeListeners = new Map<string, () => void>();
  let cleanedUp = false;
  const isCleanedUp = (): boolean => cleanedUp;

  const cleanup = (): void => {
    if (cleanedUp) return;
    cleanedUp = true;
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
    for (const unsubscribe of activeListeners.values()) {
      unsubscribe();
    }
    activeListeners.clear();
  };

  const stream = new ReadableStream({
    async start(controller: ReadableStreamDefaultController<Uint8Array>): Promise<void> {
      // Send initial handshake comment
      controller.enqueue(encoder.encode(':ok\n\n'));

      // Keepalive heartbeat to prevent timeouts (every 30 seconds)
      keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':keepalive\n\n'));
        } catch {
          // Stream might be already closed, handled in cancel/abort
          cleanup();
        }
      }, 30_000);

      // Register subscriber for each chat channel
      for (const chatId of chatIds) {
        if (isCleanedUp()) break;

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const listener = (event: ChatRealtimeEvent): void => {
          try {
            const dataString = superjson.stringify(event);
            controller.enqueue(encoder.encode(`data: ${dataString}\n\n`));
          } catch (error) {
            console.error('[SSE] Failed to write event to stream controller:', error);
          }
        };

        try {
          const unsubscribe = await chatPubSub.subscribe(chatId, listener);

          // Guard against race conditions if client aborted during the await
          if (isCleanedUp()) {
            unsubscribe();
            break;
          }

          activeListeners.set(chatId, unsubscribe);
        } catch (error) {
          console.error(`[SSE] Failed to subscribe to chat ${chatId}:`, error);
          // Could optionally send an error event to the client here
        }
      }
    },

    cancel(): void {
      cleanup();
      console.log(`[SSE] Stream cancelled for user ${user.uuid}`);
    },
  });

  // Handle client abort gracefully
  request.signal.addEventListener('abort', () => {
    cleanup();
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
