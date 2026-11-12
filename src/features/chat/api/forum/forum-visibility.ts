import {
  type ForumUser,
  isFullModerator,
  resolveForumModerator,
} from '@/features/chat/api/forum/forum-moderator';
import { getActivePiketMembers } from '@/features/chat/api/utils/piket-service';
import { type ChatRealtimeEvent, chatPubSub } from '@/lib/db/chat-pubsub';
import type { ForumRemovalInfo } from '@/lib/forum-shared';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma/enums';
import type { PrismaClientOrTransaction } from '@/types/types';
import { createLogger } from '@/utils/server-logger';

const logger = createLogger('forum:visibility');

/**
 * Who sees a forum post and its comments. A public post is the topic's; a restricted one, a post
 * still waiting for approval or one a moderator or flags hid, is only its author's, its
 * moderators' and whoever it was forwarded to. Every read of a post, of its thread and of its
 * live events asks here, so a restricted thread never reaches the rest of the topic. A private
 * conversation needs none of this: it is a chat of its own, and its members are who sees it.
 */

/** The parts of a post that decide who sees it. */
export interface ForumPostVisibility {
  messageId: string;
  chatId: string;
  approvedAt: Date | null;
  /** hidden by a moderator or by flags, see `ForumRemoval` */
  hidden: boolean;
  authorId: string | null;
}

/** Whether only its author and its moderators see a post. */
export const isRestrictedForumPost = (
  post: Pick<ForumPostVisibility, 'approvedAt' | 'hidden'>,
): boolean => post.approvedAt === null || post.hidden;

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
      approvedAt: true,
      message: { select: { senderId: true, forumRemoval: { select: { kind: true } } } },
    },
  });
  if (post === null) return undefined;
  return {
    messageId: post.messageId,
    chatId: post.chatId,
    approvedAt: post.approvedAt,
    hidden: post.message.forumRemoval?.kind === 'HIDDEN',
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
 * The ids among `messageIds` of one forum chat that `user` must not read: comments hidden by a
 * moderator or by flags, unless the user wrote them or moderates the topic. Their place stays,
 * their content goes, see `toChatMessage`.
 */
export const findHiddenFromUser = async (
  prisma: PrismaClientOrTransaction,
  user: ForumUser,
  chatId: string,
  messages: { uuid: string; senderId: string | null; parentId: string | null }[],
): Promise<Set<string>> => {
  const hidden = await prisma.forumRemoval.findMany({
    where: { messageId: { in: messages.map((message) => message.uuid) }, kind: 'HIDDEN' },
    select: { messageId: true },
  });
  if (hidden.length === 0) return new Set();
  const others = messages.filter(
    (message) =>
      message.senderId !== user.uuid && hidden.some((row) => row.messageId === message.uuid),
  );
  if (others.length === 0) return new Set();
  const postId = others[0]?.parentId ?? others[0]?.uuid;
  const moderator = await resolveForumModerator(prisma, user, chatId, postId);
  if (isFullModerator(moderator)) return new Set();
  return new Set(others.map((message) => message.uuid));
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
 * Keeps of `userIds` those who see the post: all of them for a public post, else its audience.
 * For pushes about a thread, whose subscribers may have subscribed before the post was hidden.
 */
export const filterForumPostAudience = async (
  prisma: PrismaClientOrTransaction,
  postId: string,
  userIds: string[],
): Promise<string[]> => {
  const post = await findForumPostVisibility(prisma, postId);
  if (post === undefined || !isRestrictedForumPost(post)) return userIds;
  const audience = new Set(await findRestrictedPostAudience(prisma, post));
  return userIds.filter((userId) => audience.has(userId));
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
 * Whether `user` must not know about the forum message `messageId`: it belongs to a restricted
 * post they do not see, or it is a hidden comment of someone else they do not moderate. For the
 * chat procedures that take a message id from the client, so they answer like for one that does
 * not exist.
 */
export const isForumMessageHiddenFrom = async (
  prisma: PrismaClientOrTransaction,
  user: ForumUser,
  messageId: string,
): Promise<boolean> => {
  const message = await prisma.message.findUnique({
    where: { uuid: messageId },
    select: { uuid: true, chatId: true, senderId: true, parentId: true },
  });
  if (message === null) return false;
  const post = await findForumPostVisibility(prisma, message.parentId ?? message.uuid);
  if (post !== undefined && !(await canSeeForumPost(prisma, user, post))) return true;
  if (message.parentId === null) return false;
  const hidden = await findHiddenFromUser(prisma, user, message.chatId, [message]);
  return hidden.has(message.uuid);
};

/**
 * The removals among the messages of one forum thread, as `user` reads them: which are hidden
 * from them, and for each removed one the placeholder's details. The reason's note is only for
 * the message's author and the moderators.
 */
export const describeForumRemovals = async (
  prisma: PrismaClientOrTransaction,
  user: ForumUser,
  chatId: string,
  messages: { uuid: string; senderId: string | null; parentId: string | null }[],
): Promise<{ removals: Map<string, ForumRemovalInfo>; hidden: Set<string> }> => {
  const rows = await prisma.forumRemoval.findMany({
    where: { messageId: { in: messages.map((message) => message.uuid) } },
  });
  if (rows.length === 0) return { removals: new Map(), hidden: new Set() };
  const first = messages.find((message) => rows.some((row) => row.messageId === message.uuid));
  const moderator = await resolveForumModerator(
    prisma,
    user,
    chatId,
    first?.parentId ?? first?.uuid,
  );
  const moderates = moderator !== undefined && moderator.capacity !== 'DELEGATE';
  const senderOf = new Map(messages.map((message) => [message.uuid, message.senderId]));
  const removals = new Map<string, ForumRemovalInfo>();
  const hidden = new Set<string>();
  for (const row of rows) {
    const own = senderOf.get(row.messageId) === user.uuid;
    removals.set(row.messageId, {
      kind: row.kind,
      reason: row.reason,
      note: own || moderates ? row.note : null,
      byCapacity: row.capacity === 'AUTOMATIC' ? null : row.capacity,
      at: row.createdAt,
      reviewRequested: row.reviewRequestedAt !== null,
    });
    if (row.kind === 'HIDDEN' && !own && !moderates) hidden.add(row.messageId);
  }
  return { removals, hidden };
};
