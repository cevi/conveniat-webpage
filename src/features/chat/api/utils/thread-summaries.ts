import type { ThreadSummary } from '@/features/chat/api/types';
import type { PrismaClientOrTransaction } from '@/types/types';
import { profilePictureUrlOrUndefined } from '@/utils/profile-picture-url';

/** How many of the people who replied in a thread are named, for the avatars on its chip. */
export const THREAD_SUMMARY_REPLIERS = 3;

/** The thread under one message: how many replies it has, and who replied when. */
export interface MessageThread {
  replyCount: number;
  summary: ThreadSummary;
}

/**
 * The threads under the given messages: how many replies each has, and who replied and when
 * the last reply came, with the people of the latest reply first, at most
 * {@link THREAD_SUMMARY_REPLIERS} of them, and how many replied in all. A deleted reply still
 * counts, like it keeps its place in the thread.
 *
 * Two queries for a whole page of messages: one grouped over the replies, one for the names
 * of the people shown. Messages without replies are left out of the map.
 *
 * The count comes from the grouped query rather than a `_count` of the relation, because
 * Prisma 7 joins a relation count against a count over the whole `Message` table, see
 * https://github.com/prisma/orm/issues/23669, while `parentId IN (…)` reads only the replies.
 *
 * @param prisma - the client or the transaction to read with
 * @param messageIds - the messages whose threads to find, with or without replies
 */
export const findThreadSummaries = async (
  prisma: PrismaClientOrTransaction,
  messageIds: string[],
): Promise<Map<string, MessageThread>> => {
  const threads = new Map<string, MessageThread>();
  if (messageIds.length === 0) return threads;

  const lastReplyBySender = await prisma.message.groupBy({
    by: ['parentId', 'senderId'],
    where: { parentId: { in: messageIds } },
    _max: { createdAt: true },
    _count: { _all: true },
  });

  const repliesByThread = new Map<
    string,
    { senderId: string | null; lastAt: Date; count: number }[]
  >();
  for (const row of lastReplyBySender) {
    const lastAt = row._max.createdAt;
    if (row.parentId === null || lastAt === null) continue;
    const replies = repliesByThread.get(row.parentId) ?? [];
    replies.push({ senderId: row.senderId, lastAt, count: row._count._all });
    repliesByThread.set(row.parentId, replies);
  }

  const shownByThread = new Map<
    string,
    { senderIds: string[]; lastReplyAt: Date; count: number; replyCount: number }
  >();
  const shownSenderIds = new Set<string>();
  for (const [threadId, replies] of repliesByThread) {
    const latestFirst = replies.toSorted((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
    const lastReplyAt = latestFirst[0]?.lastAt;
    if (lastReplyAt === undefined) continue;
    const people = latestFirst
      .map((reply) => reply.senderId)
      .filter((senderId): senderId is string => senderId !== null);
    const senderIds = people.slice(0, THREAD_SUMMARY_REPLIERS);
    for (const senderId of senderIds) shownSenderIds.add(senderId);
    const replyCount = replies.reduce((sum, reply) => sum + reply.count, 0);
    shownByThread.set(threadId, { senderIds, lastReplyAt, count: people.length, replyCount });
  }

  const users =
    shownSenderIds.size === 0
      ? []
      : await prisma.user.findMany({
          where: { uuid: { in: [...shownSenderIds] } },
          select: { uuid: true, name: true, profilePictureVersion: true },
        });
  const userById = new Map(users.map((user) => [user.uuid, user]));

  for (const [threadId, shown] of shownByThread) {
    threads.set(threadId, {
      replyCount: shown.replyCount,
      summary: {
        lastReplyAt: shown.lastReplyAt,
        replierCount: shown.count,
        repliers: shown.senderIds.map((senderId) => {
          const user = userById.get(senderId);
          const pictureUrl = profilePictureUrlOrUndefined(senderId, user?.profilePictureVersion);
          return {
            id: senderId,
            name: user?.name ?? '',
            ...(pictureUrl === undefined ? {} : { pictureUrl }),
          };
        }),
      },
    });
  }
  return threads;
};
