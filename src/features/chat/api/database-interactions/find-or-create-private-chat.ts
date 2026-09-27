import { createNewChat } from '@/features/chat/api/database-interactions/create-new-chat';
import { findChatWithMembers } from '@/features/chat/api/database-interactions/find-chat-with-members';
import { checkCapability } from '@/lib/capabilities';
import { CapabilityAction, CapabilitySubject } from '@/lib/capabilities/types';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { Locale, PrismaClientOrTransaction } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import { TRPCError } from '@trpc/server';

const logger = createLogger('chat:mutations');

/**
 * Returns the one-to-one chat between the user and another person, creating it if there is
 * none yet.
 *
 * Must run inside a transaction. Concurrent calls for the same pair are serialised on an
 * advisory lock held until that transaction ends, so two requests racing through here
 * (a double tap, a phone opening a scanned link twice) end up in the same chat instead of
 * both missing the lookup and creating one each.
 */
export const findOrCreatePrivateChat = async ({
  user,
  otherUserId,
  locale,
  prisma,
  chatId,
  afterCommit,
}: {
  user: HitobitoNextAuthUser;
  otherUserId: string;
  locale: Locale;
  prisma: PrismaClientOrTransaction;
  /** Client-generated id to create the chat under, see `CreateChatOptions.uuid`. */
  chatId?: string | undefined;
  afterCommit?: ((callback: () => void) => void) | undefined;
}): Promise<string> => {
  const memberUuids = [user.uuid, otherUserId].sort();
  const pairKey = `private-chat:${memberUuids.join(':')}`;
  await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${pairKey}, 0))`;

  const existingChat = await findChatWithMembers(memberUuids, prisma, false);
  if (existingChat?.chatMemberships.length === 2) {
    logger.debug('Reusing the existing private chat', { 'chat.id': existingChat.uuid });
    return existingChat.uuid;
  }

  const isChatCreationEnabled = await checkCapability(
    CapabilityAction.Create,
    CapabilitySubject.Chat,
  );
  if (!isChatCreationEnabled) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Chat creation is currently disabled.' });
  }

  const chat = await createNewChat('', locale, user, [{ userId: otherUserId }], prisma, {
    ...(afterCommit === undefined ? {} : { afterCommit }),
    ...(chatId === undefined ? {} : { uuid: chatId }),
  });
  return chat.uuid;
};
