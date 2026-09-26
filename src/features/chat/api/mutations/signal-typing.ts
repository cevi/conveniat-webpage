import { chatPubSub } from '@/lib/db/chat-pubsub';
import { ChatMembershipPermission } from '@/lib/prisma/client';
import { trpcBaseProcedure } from '@/trpc/init';
import { createLogger } from '@/utils/server-logger';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const logger = createLogger('chat:mutations');

const signalTypingInputSchema = z.object({
  chatId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
});

/**
 * Tells the other members that the user is typing. Nothing is stored: the event lives only on
 * the realtime stream, and clients drop it a few seconds after the last one they received.
 */
export const signalTyping = trpcBaseProcedure
  .input(signalTypingInputSchema)
  .mutation(async ({ input, ctx }) => {
    const { user, prisma } = ctx;
    const { chatId, parentId } = input;

    const membership = await prisma.chatMembership.findUnique({
      where: { userId_chatId: { userId: user.uuid, chatId } },
      select: { chatPermission: true, hasDeleted: true },
    });

    // guests only write in threads, so only their thread typing is announced
    const isGuestOutsideThread =
      membership?.chatPermission === ChatMembershipPermission.GUEST && parentId === undefined;
    if (!membership || membership.hasDeleted || isGuestOutsideThread) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You cannot write in this chat.' });
    }

    // Debug: a lost typing signal costs nothing, and this fires every few seconds per typist.
    await chatPubSub
      .publish({
        type: 'typing',
        chatId,
        senderId: user.uuid,
        typing: { name: user.name, parentId },
      })
      .catch((error: unknown) => {
        logger.debug('Failed to publish the typing event', { error, 'chat.id': chatId });
      });
  });
