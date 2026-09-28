import { checkForDuplicateMembers } from '@/features/chat/api/checks/check-for-duplicate-members';
import { isUserMemberOfChat } from '@/features/chat/api/checks/is-user-member-of-chat';
import { assertChatNameLength, verifyChatName } from '@/features/chat/api/checks/verify-chat-name';
import { createNewChat } from '@/features/chat/api/database-interactions/create-new-chat';
import { findOrCreatePrivateChat } from '@/features/chat/api/database-interactions/find-or-create-private-chat';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { rateLimit } from '@/trpc/middleware/rate-limit';
import { createLogger } from '@/utils/server-logger';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const logger = createLogger('chat:mutations');

const contactSchema = z.object({
  userId: z.string().regex(/^[0-9a-f]{24}$/, 'Invalid chat ID format.'),
});

const createChatInputSchema = z.object({
  members: z
    .array(contactSchema)
    .min(1, 'A chat must have at least one member besides the creator.'),
  chatName: z.string().optional(), // full verification done in business logic
  // Client-generated identity of this chat. Sending it lets the client open the chat
  // right away — also while offline — and makes the mutation idempotent: a replayed
  // creation (offline outbox drain, lost response, retry) carries the same id and is
  // answered with the chat already stored instead of creating a second one.
  chatId: z.string().uuid('Invalid chat ID format.').optional(),
});

export const createChat = trpcBaseProcedure
  .input(createChatInputSchema)
  .use(
    // Replays of an offline creation count too; the outbox retries them once the window ends.
    rateLimit({
      name: 'chat.createChat',
      limit: 20,
      windowMs: 10 * 60 * 1000,
      message: {
        de: 'Du hast in kurzer Zeit zu viele Chats erstellt. Versuche es in ein paar Minuten wieder.',
        en: 'You created too many chats in a short time. Try again in a few minutes.',
        fr: 'Tu as créé trop de chats en peu de temps. Réessaie dans quelques minutes.',
      },
    }),
  )
  .use(databaseTransactionWrapper) // use a DB transaction for this mutation
  .mutation(async ({ input, ctx }) => {
    const { locale, prisma, user } = ctx;
    const { members, chatName, chatId } = input;

    if (isUserMemberOfChat(user, members)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'You must be a member of the chat you are trying to create.',
      });
    }

    // additional validation checks
    checkForDuplicateMembers(members);
    verifyChatName(chatName, members);
    assertChatNameLength(chatName, locale);

    const finalChatName = chatName?.trim() ?? '';

    // Idempotency: a replay of the same creation carries the same client-generated id.
    // Answer it with the chat that already exists instead of creating a second one.
    if (chatId !== undefined) {
      // Serialise concurrent replays of the same id (two tabs draining the same offline
      // outbox). Without this both could pass the lookup below before either insert
      // commits, and the loser would fail on the primary key instead of being answered
      // with the stored chat. The lock is released when this transaction ends.
      await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${chatId}, 0))`;

      const alreadyCreated = await prisma.chat.findUnique({
        where: { uuid: chatId },
        select: { uuid: true, chatMemberships: { select: { userId: true } } },
      });

      if (alreadyCreated) {
        // The id is client-chosen, so make sure this really is a replay of *this* user's
        // creation rather than an attempt to claim someone else's chat.
        if (!alreadyCreated.chatMemberships.some((membership) => membership.userId === user.uuid)) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A different chat with this ID already exists.',
          });
        }

        logger.debug('Duplicate chat creation ignored, returning the stored copy', {
          'chat.id': chatId,
        });
        return alreadyCreated.uuid;
      }
    }

    const firstMember = members[0];
    if (members.length === 1 && firstMember !== undefined) {
      return await findOrCreatePrivateChat({
        user,
        otherUserId: firstMember.userId,
        locale,
        prisma,
        chatId,
        afterCommit: ctx.afterTransactionCommit,
      });
    }

    const { checkCapability } = await import('@/lib/capabilities');
    const { CapabilitySubject, CapabilityAction } = await import('@/lib/capabilities/types');

    const isChatCreationEnabled = await checkCapability(
      CapabilityAction.Create,
      CapabilitySubject.Chat,
    );

    if (!isChatCreationEnabled) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Chat creation is currently disabled.',
      });
    }

    const chat = await createNewChat(finalChatName, locale, user, members, prisma, {
      afterCommit: ctx.afterTransactionCommit,
      ...(chatId === undefined ? {} : { uuid: chatId }),
    });
    return chat.uuid; // Return the ID of the newly created chat
  });
