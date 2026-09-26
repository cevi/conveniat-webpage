import {
  assertMembershipCanWrite,
  assertWriteAbilities,
} from '@/features/chat/api/checks/assert-can-write-in-chat';
import { chatPubSub } from '@/lib/db/chat-pubsub';
import { trpcBaseProcedure } from '@/trpc/init';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const signalTypingInputSchema = z.object({
  chatId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
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

    await assertWriteAbilities(chatId, parentId);

    const chat = await prisma.chat.findUnique({
      where: { uuid: chatId },
      select: {
        capabilities: true,
        // only the sender's row: this runs every few seconds per typist, in chats of any size
        chatMemberships: {
          where: { userId: user.uuid },
          select: { userId: true, chatPermission: true },
        },
      },
    });
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

    // publish logs its own failures, at debug for typing
    await chatPubSub.publish({
      type: 'typing',
      chatId,
      senderId: user.uuid,
      typing: { name: user.name, parentId },
    });
  });
