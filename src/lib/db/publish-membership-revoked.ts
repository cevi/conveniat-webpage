import { chatPubSub } from '@/lib/db/chat-pubsub';
import { createLogger } from '@/utils/server-logger';

const logger = createLogger('chat:pubsub');

/**
 * Tells every open stream of `userId` that they are no longer a member of `chatId`.
 *
 * The SSE route checks membership only when a stream connects, so every path that deletes
 * a chat membership has to call this once the deletion is committed. Without it the removed
 * user keeps receiving the chat live until their connection drops.
 *
 * Never throws: the membership is already gone, and a failed publish must not fail the
 * operation that removed it.
 */
export const publishMembershipRevoked = async (
  userId: string,
  chatId: string,
  senderId: string,
): Promise<void> => {
  try {
    await chatPubSub.publish(userId, { type: 'membership_revoked', chatId, senderId });
  } catch (error) {
    logger.error('Failed to publish the membership_revoked event', {
      error,
      'chat.id': chatId,
      'chat.user.id': userId,
    });
  }
};
