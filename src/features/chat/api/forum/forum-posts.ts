import { FORUM_LIKE_EMOJI, type ForumPostSummary } from '@/lib/forum-shared';
import { ChatMembershipPermission, type Prisma } from '@/lib/prisma/client';
import type { PrismaClientOrTransaction } from '@/types/types';

export type { ForumPostSummary } from '@/lib/forum-shared';

export const EXCERPT_LENGTH = 160;

/** The columns every summary reads, for `prisma.forumPost.findMany({ select })`. */
export const FORUM_POST_SUMMARY_SELECT = {
  messageId: true,
  chatId: true,
  title: true,
  status: true,
  createdAt: true,
  longitude: true,
  latitude: true,
  annotationId: true,
  pinnedAt: true,
  chat: { select: { name: true } },
  message: {
    select: {
      senderId: true,
      sender: { select: { name: true } },
      contentVersions: { take: 1, orderBy: { revision: 'desc' }, select: { payload: true } },
    },
  },
} satisfies Prisma.ForumPostSelect;

export type ForumPostSummaryRow = Prisma.ForumPostGetPayload<{
  select: typeof FORUM_POST_SUMMARY_SELECT;
}>;

/**
 * The text and images of a post, read back from its message content. Defensive, because the
 * payload is JSON written by every release since the forum started.
 */
export const readForumPostContent = (payload: unknown): { text: string; images: string[] } => {
  if (typeof payload === 'string') return { text: payload, images: [] };
  const record = (payload ?? {}) as Record<string, unknown>;
  const text = typeof record['text'] === 'string' ? record['text'] : '';
  const images = Array.isArray(record['images'])
    ? record['images'].filter((image): image is string => typeof image === 'string')
    : [];
  return { text, images };
};

const excerptOf = (text: string): string => {
  const flat = text.replaceAll(/\s+/g, ' ').trim();
  return flat.length > EXCERPT_LENGTH ? `${flat.slice(0, EXCERPT_LENGTH - 1)}…` : flat;
};

/**
 * Turns rows into summaries with three batched reads, however many rows: the likes (with the
 * posts merged into each), the comments, and whether each author is one of the topic's admins.
 */
export const toForumPostSummaries = async (
  prisma: PrismaClientOrTransaction,
  userId: string,
  rows: ForumPostSummaryRow[],
): Promise<ForumPostSummary[]> => {
  if (rows.length === 0) return [];
  const postIds = rows.map((row) => row.messageId);

  const merged = await prisma.forumPost.findMany({
    where: { mergedIntoId: { in: postIds } },
    select: { messageId: true, mergedIntoId: true },
  });
  const likedIds = [...postIds, ...merged.map((post) => post.messageId)];
  const targetOf = new Map<string, string>(
    merged.map((post) => [post.messageId, post.mergedIntoId ?? post.messageId]),
  );

  const [reactions, comments, adminMemberships] = await Promise.all([
    prisma.messageReaction.findMany({
      where: { messageId: { in: likedIds }, emoji: FORUM_LIKE_EMOJI },
      select: { messageId: true, userId: true },
    }),
    prisma.message.groupBy({
      by: ['parentId'],
      where: { parentId: { in: postIds }, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.chatMembership.findMany({
      where: {
        chatId: { in: [...new Set(rows.map((row) => row.chatId))] },
        userId: {
          in: rows.map((row) => row.message.senderId).filter((id): id is string => id !== null),
        },
        chatPermission: { in: [ChatMembershipPermission.OWNER, ChatMembershipPermission.ADMIN] },
      },
      select: { chatId: true, userId: true },
    }),
  ]);

  const likers = new Map<string, Set<string>>();
  for (const reaction of reactions) {
    const target = targetOf.get(reaction.messageId) ?? reaction.messageId;
    const set = likers.get(target) ?? new Set<string>();
    set.add(reaction.userId);
    likers.set(target, set);
  }
  const commentCount = new Map(comments.map((group) => [group.parentId, group._count._all]));
  const admins = new Set(adminMemberships.map((m) => `${m.chatId}:${m.userId}`));

  return rows.map((row) => {
    const content = readForumPostContent(row.message.contentVersions[0]?.payload);
    const senderId = row.message.senderId;
    const liked = likers.get(row.messageId);
    return {
      id: row.messageId,
      topicId: row.chatId,
      topicName: row.chat.name,
      title: row.title,
      excerpt: excerptOf(content.text),
      status: row.status,
      createdAt: row.createdAt,
      author: senderId === null ? null : { id: senderId, name: row.message.sender?.name ?? '' },
      byTopicAdmin: senderId !== null && admins.has(`${row.chatId}:${senderId}`),
      location:
        row.longitude === null || row.latitude === null
          ? null
          : { longitude: row.longitude, latitude: row.latitude, annotationId: row.annotationId },
      likeCount: liked?.size ?? 0,
      likedByMe: liked?.has(userId) ?? false,
      commentCount: commentCount.get(row.messageId) ?? 0,
      pinned: row.pinnedAt !== null,
      imageCount: content.images.length,
    };
  });
};

/**
 * The posts a user may see: those of the topics they belong to. A helper belongs to the topic
 * of their assignment for as long as it is open, see `createForumPostAssignment`.
 */
export const visibleForumPostsWhere = (userId: string): Prisma.ForumPostWhereInput => ({
  mergedIntoId: null,
  message: { deletedAt: null },
  chat: {
    type: 'FORUM',
    archivedAt: null,
    chatMemberships: { some: { userId } },
  },
});
