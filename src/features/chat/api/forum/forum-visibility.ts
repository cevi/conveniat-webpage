import { type ForumUser, resolveForumModerator } from '@/features/chat/api/forum/forum-moderator';
import { getActivePiketMembers } from '@/features/chat/api/utils/piket-service';
import { type ChatRealtimeEvent, chatPubSub } from '@/lib/db/chat-pubsub';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma/client';
import type { PrismaClientOrTransaction } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { getPayload } from 'payload';

const logger = createLogger('forum:visibility');

/**
 * Who sees a forum post and its comments. A public post is the topic's; a restricted one, a
 * private report to the Zentrale or a post still waiting for approval, is only its author's,
 * the topic's Kernteam's and the piket's on duty. Every read of a post, of its thread and of its
 * live events asks here, so a restricted thread never reaches the rest of the topic.
 */

/** The parts of a post that decide who sees it. */
export interface ForumPostVisibility {
  messageId: string;
  chatId: string;
  private: boolean;
  approvedAt: Date | null;
  authorId: string | null;
}

/** Whether only its author and its moderators see a post. */
export const isRestrictedForumPost = (
  post: Pick<ForumPostVisibility, 'private' | 'approvedAt'>,
): boolean => post.private || post.approvedAt === null;

/**
 * The forum post a thread belongs to, by the post's own id: what decides who sees the thread.
 * Undefined for a message that is no forum post, a thread of an ordinary chat.
 */
export const findForumPostVisibility = async (
  prisma: PrismaClientOrTransaction,
  postId: string,
): Promise<ForumPostVisibility | undefined> => {
  const post = await prisma.forumPost.findUnique({
    where: { messageId: postId },
    select: {
      messageId: true,
      chatId: true,
      private: true,
      approvedAt: true,
      message: { select: { senderId: true } },
    },
  });
  if (post === null) return undefined;
  return {
    messageId: post.messageId,
    chatId: post.chatId,
    private: post.private,
    approvedAt: post.approvedAt,
    authorId: post.message.senderId,
  };
};

/**
 * Whether `user` may read the post and its comments: anyone in the topic for a public post; for
 * a restricted one its author, its moderators, and whoever it was forwarded to.
 */
export const canSeeForumPost = async (
  prisma: PrismaClientOrTransaction,
  user: ForumUser,
  post: ForumPostVisibility,
): Promise<boolean> => {
  if (!isRestrictedForumPost(post) || post.authorId === user.uuid) return true;
  // a forward grants seeing the post, the DELEGATE capacity
  return (await resolveForumModerator(prisma, user, post.chatId, post.messageId)) !== undefined;
};

/**
 * Everyone who sees a restricted post: its author, the topic's Kernteam, the piket on duty, and
 * whoever it was forwarded to. The Forum-Zentrale sees it too, but holds no membership to find
 * it by; it reads the post again when it opens it.
 */
export const findRestrictedPostAudience = async (
  prisma: PrismaClientOrTransaction,
  post: Pick<ForumPostVisibility, 'messageId' | 'chatId' | 'authorId'>,
): Promise<string[]> => {
  const [admins, piket, forwards] = await Promise.all([
    prisma.chatMembership.findMany({
      where: {
        chatId: post.chatId,
        chatPermission: { in: [ChatMembershipPermission.OWNER, ChatMembershipPermission.ADMIN] },
      },
      select: { userId: true },
    }),
    getActivePiketMembers(ChatType.FORUM).catch((error: unknown) => {
      logger.error('Failed to read the forum piket on duty', { error });
      return [];
    }),
    prisma.forumPostAssignment.findMany({
      where: { messageId: post.messageId, kind: 'HELPER', endedAt: null },
      select: { assigneeId: true },
    }),
  ]);
  return [
    ...new Set([
      ...(post.authorId === null ? [] : [post.authorId]),
      ...admins.map((membership) => membership.userId),
      ...piket.map((member) => member.id),
      ...forwards.map((forward) => forward.assigneeId),
    ]),
  ];
};

/**
 * Publishes an event of a forum thread: on the topic's channel for a public post, and for a
 * restricted one only on the personal channels of those who see it, since everyone with a page
 * of the topic open listens on the topic's channel.
 */
export const publishForumThreadEvent = async (
  prisma: PrismaClientOrTransaction,
  post: ForumPostVisibility,
  event: ChatRealtimeEvent,
): Promise<void> => {
  if (!isRestrictedForumPost(post)) {
    await chatPubSub.publish(event);
    return;
  }
  const audience = await findRestrictedPostAudience(prisma, post);
  await Promise.all(audience.map((userId) => chatPubSub.publish(userId, event)));
};

/**
 * The chat of the topic editors marked to receive private reports, or undefined while none is.
 */
export const findPrivateReportTopicId = async (): Promise<string | undefined> => {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: 'forum-topics',
    where: { receivesPrivateReports: { equals: true } },
    limit: 1,
    depth: 0,
    select: { chatUuid: true },
  });
  const chatUuid = docs[0]?.chatUuid;
  return typeof chatUuid === 'string' && chatUuid !== '' ? chatUuid : undefined;
};
