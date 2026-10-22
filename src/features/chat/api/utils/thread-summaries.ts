import type { ThreadSummary } from '@/features/chat/api/types';
import type { PrismaClientOrTransaction } from '@/types/types';
import { profilePictureUrlOrUndefined } from '@/utils/profile-picture-url';

/** How many of the people who replied in a thread are named, for the avatars on its chip. */
export const THREAD_SUMMARY_REPLIERS = 3;

/**
 * Who replied in each of the given threads and when the last reply came: the people with the
 * latest reply first, at most {@link THREAD_SUMMARY_REPLIERS} of them, and how many replied in
 * all. A deleted reply still counts, like it keeps its place in the thread.
 *
 * Two queries for a whole page of messages: one grouped over the replies, one for the names
 * of the people shown. Threads without replies are left out of the map.
 *
 * @param prisma - the client or the transaction to read with
 * @param threadIds - the messages whose threads to summarise; only those with replies matter
 */
export const findThreadSummaries = async (
  prisma: PrismaClientOrTransaction,
  threadIds: string[],
): Promise<Map<string, ThreadSummary>> => {
  const summaries = new Map<string, ThreadSummary>();
  if (threadIds.length === 0) return summaries;

  const lastReplyBySender = await prisma.message.groupBy({
    by: ['parentId', 'senderId'],
    where: { parentId: { in: threadIds } },
    _max: { createdAt: true },
  });

  const repliesByThread = new Map<string, { senderId: string | null; lastAt: Date }[]>();
  for (const row of lastReplyBySender) {
    const lastAt = row._max.createdAt;
    if (row.parentId === null || lastAt === null) continue;
    const replies = repliesByThread.get(row.parentId) ?? [];
    replies.push({ senderId: row.senderId, lastAt });
    repliesByThread.set(row.parentId, replies);
  }

  const shownByThread = new Map<
    string,
    { senderIds: string[]; lastReplyAt: Date; count: number }
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
    shownByThread.set(threadId, { senderIds, lastReplyAt, count: people.length });
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
    summaries.set(threadId, {
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
    });
  }
  return summaries;
};
