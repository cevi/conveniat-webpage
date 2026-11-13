import {
  assertMembershipCanWrite,
  assertWriteAbilities,
} from '@/features/chat/api/checks/assert-can-write-in-chat';
import { chatPubSub } from '@/lib/db/chat-pubsub';
import { ChatType } from '@/lib/prisma/enums';
import { trpcBaseProcedure } from '@/trpc/init';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const signalTypingInputSchema = z.object({
  chatId: z.uuid(),
  parentId: z.uuid().optional(),
});

/** Clients signal every 2.5 s; anything faster is dropped before it reaches pg_notify. */
const MIN_SIGNAL_INTERVAL_MS = 2000;
const MAX_TRACKED_TYPISTS = 5000;
const lastSignalAt = new Map<string, number>();

const isTooSoon = (key: string, now: number): boolean => {
  const last = lastSignalAt.get(key);
  if (last !== undefined && now - last < MIN_SIGNAL_INTERVAL_MS) return true;
  if (lastSignalAt.size >= MAX_TRACKED_TYPISTS) lastSignalAt.clear();
  lastSignalAt.set(key, now);
  return false;
};

/**
 * Tells the other members that the user is typing. Allowed exactly where the user could
 * send the message itself. Nothing is stored: the event lives only on the realtime stream,
 * and clients drop it a few seconds after the last one they received.
 */
export const signalTyping = trpcBaseProcedure
  .input(signalTypingInputSchema)
  .mutation(async ({ input, ctx }) => {
    const { user, prisma } = ctx;
    const { chatId, parentId } = input;

    if (isTooSoon(`${user.uuid}:${chatId}:${parentId ?? ''}`, Date.now())) return;

    const chat = await prisma.chat.findUnique({
      where: { uuid: chatId },
      select: {
        type: true,
        capabilities: true,
        status: true,
        archivedAt: true,
        // only the sender's row: this runs every few seconds per typist, in chats of any size
        chatMemberships: {
          where: { userId: user.uuid },
          select: { userId: true, chatPermission: true },
        },
      },
    });
    await assertWriteAbilities(prisma, chatId, parentId, chat);
    assertMembershipCanWrite(chat, chatId, user.uuid, parentId);

    if (parentId !== undefined) {
      const parent = await prisma.message.findFirst({
        where: { uuid: parentId, chatId },
        select: { uuid: true },
      });
      if (!parent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Thread not found in this chat.' });
      }
    }

    const event = {
      type: 'typing' as const,
      chatId,
      senderId: user.uuid,
      typing: { name: user.name, parentId },
    };
    // in the thread of a forum post only some may see, only they hear who types there
    if (chat.type === ChatType.FORUM && parentId !== undefined) {
      const { canSeeForumPost, findForumPostVisibility, publishForumThreadEvent } =
        await import('@/features/chat/api/forum/forum-visibility');
      const post = await findForumPostVisibility(prisma, parentId);
      if (post !== undefined) {
        if (!(await canSeeForumPost(prisma, user, post))) return;
        await publishForumThreadEvent(prisma, post, event);
        return;
      }
    }

    // publish logs its own failures, at debug for typing
    await chatPubSub.publish(event);
  });
