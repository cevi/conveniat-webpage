import { forumError } from '@/features/chat/api/forum/forum-errors';
import {
  findModeratedTopicIds,
  type ForumUser,
  isForumZentrale,
  resolveForumModerator,
} from '@/features/chat/api/forum/forum-moderator';
import {
  FORUM_POST_SUMMARY_SELECT,
  markForumPostReacted,
  type ModeratedTopics,
  toForumPostSummaries,
  visibleForumPostsWhere,
} from '@/features/chat/api/forum/forum-posts';
import { getFunktionDirectory } from '@/features/payload-cms/payload-cms/utils/funktionen';
import type { ForumPostSummary } from '@/lib/forum-shared';
import { type Prisma } from '@/lib/prisma/client';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma/enums';
import { trpcBaseProcedure } from '@/trpc/init';
import type { PrismaClientOrTransaction } from '@/types/types';
import config from '@payload-config';
import { getPayload } from 'payload';
import { z } from 'zod';

/**
 * The Zentrale: the queue of what the people who handle posts have to answer, for the piket at
 * the desk as for the Kernteam on its phone. A post waits until its first reaction, a comment
 * or a status change by one of them (`ForumPost.reactedAt`); forwarding or taking it is none.
 */

export const ZENTRALE_TABS = ['waiting', 'claimed', 'mine', 'open'] as const;
export type ZentraleTab = (typeof ZENTRALE_TABS)[number];

/** A post in the queue, with who handles it. */
export interface ZentralePost extends ForumPostSummary {
  /** who said "Ich übernehme" */
  claimedBy: { id: string; name: string } | null;
  /** who it is forwarded to: the label of each Ressort, the name of each person */
  forwardedTo: string[];
  /** no reaction yet, so it waits since it was written */
  waiting: boolean;
}

const QUEUE_PAGE_SIZE = 30;

/** What a tab holds, within the topics the caller moderates; "An mich" in any topic. */
const tabWhere = (
  tab: ZentraleTab,
  userId: string,
  moderated: ModeratedTopics,
): Prisma.ForumPostWhereInput => {
  const scope = moderated === 'all' ? {} : { chatId: { in: moderated } };
  const notDone: Prisma.ForumPostWhereInput = { status: { not: 'DONE' } };
  switch (tab) {
    case 'waiting': {
      return { ...notDone, ...scope, reactedAt: null };
    }
    case 'claimed': {
      return { ...notDone, ...scope, assignments: { some: { kind: 'CLAIM', endedAt: null } } };
    }
    case 'mine': {
      return {
        ...notDone,
        assignments: { some: { kind: 'HELPER', endedAt: null, assigneeId: userId } },
      };
    }
    case 'open': {
      return { ...notDone, ...scope };
    }
  }
};

/**
 * Records a comment as the post's reaction when its writer handles posts: the Kernteam, the
 * piket, the Zentrale, or someone the post was forwarded to.
 */
export const recordForumReaction = async (
  prisma: PrismaClientOrTransaction,
  user: ForumUser,
  post: { messageId: string; chatId: string },
): Promise<void> => {
  const moderator = await resolveForumModerator(prisma, user, post.chatId, post.messageId);
  if (moderator !== undefined) await markForumPostReacted(prisma, post.messageId);
};

/** How many posts wait and how many are forwarded to the caller, for the forum's header. */
export const countZentrale = async (
  prisma: PrismaClientOrTransaction,
  user: ForumUser,
  moderated: ModeratedTopics,
): Promise<{ waiting: number; mine: number } | null> => {
  const count = (tab: ZentraleTab): Promise<number> =>
    prisma.forumPost.count({
      where: {
        AND: [visibleForumPostsWhere(user.uuid, moderated), tabWhere(tab, user.uuid, moderated)],
      },
    });
  const [waiting, mine] = await Promise.all([
    moderated === 'all' || moderated.length > 0 ? count('waiting') : Promise.resolve(0),
    count('mine'),
  ]);
  // nothing to moderate and nothing forwarded: no Zentrale for this person
  if (moderated !== 'all' && moderated.length === 0 && mine === 0) return null;
  return { waiting, mine };
};

/**
 * One tab of the queue, oldest first: what waits longest comes first. For whoever handles posts
 * in a topic, and for anyone something was forwarded to.
 */
export const getForumZentraleList = trpcBaseProcedure
  .input(
    z.object({
      tab: z.enum(ZENTRALE_TABS),
      cursor: z.number().int().min(0).nullish(),
    }),
  )
  .query(async ({ ctx, input }): Promise<{ items: ZentralePost[]; nextCursor: number | null }> => {
    const userId = ctx.user.uuid;
    const offset = input.cursor ?? 0;
    const moderated = await findModeratedTopicIds(ctx.prisma, ctx.user);
    const rows = await ctx.prisma.forumPost.findMany({
      where: {
        AND: [visibleForumPostsWhere(userId, moderated), tabWhere(input.tab, userId, moderated)],
      },
      select: { ...FORUM_POST_SUMMARY_SELECT, reactedAt: true },
      orderBy: { createdAt: 'asc' },
      skip: offset,
      take: QUEUE_PAGE_SIZE + 1,
    });
    const page = rows.slice(0, QUEUE_PAGE_SIZE);
    const [summaries, assignments] = await Promise.all([
      toForumPostSummaries(ctx.prisma, userId, page, ctx.locale),
      ctx.prisma.forumPostAssignment.findMany({
        where: { messageId: { in: page.map((row) => row.messageId) }, endedAt: null },
        orderBy: { createdAt: 'asc' },
        select: {
          messageId: true,
          kind: true,
          funktionId: true,
          assignee: { select: { uuid: true, name: true } },
        },
      }),
    ]);
    const labels = assignments.some((assignment) => assignment.funktionId !== null)
      ? await getFunktionDirectory(await getPayload({ config }), ctx.locale)
      : new Map<string, { label: string }>();

    const items = summaries.map((summary): ZentralePost => {
      const own = assignments.filter((assignment) => assignment.messageId === summary.id);
      const claim = own.find((assignment) => assignment.kind === 'CLAIM');
      const forwardedTo = [
        ...new Set(
          own
            .filter((assignment) => assignment.kind === 'HELPER')
            .map((assignment) =>
              assignment.funktionId === null
                ? assignment.assignee.name
                : (labels.get(assignment.funktionId)?.label ?? assignment.assignee.name),
            ),
        ),
      ];
      return {
        ...summary,
        claimedBy:
          claim === undefined ? null : { id: claim.assignee.uuid, name: claim.assignee.name },
        forwardedTo,
        waiting: page.find((row) => row.messageId === summary.id)?.reactedAt === null,
      };
    });
    return { items, nextCursor: rows.length > QUEUE_PAGE_SIZE ? offset + QUEUE_PAGE_SIZE : null };
  });

/**
 * Makes the Forum-Zentrale a member of every topic, which reading and commenting ask for. Like
 * the piket's own sync, since the audience sync knows nothing of the role and takes them out
 * again, until they open the forum the next time.
 */
export const ensureZentraleMemberships = async (
  prisma: PrismaClientOrTransaction,
  user: ForumUser,
): Promise<void> => {
  if (!isForumZentrale(user)) return;
  const topics = await prisma.chat.findMany({
    where: {
      type: ChatType.FORUM,
      archivedAt: null,
      chatMemberships: { none: { userId: user.uuid } },
    },
    select: { uuid: true },
  });
  if (topics.length === 0) return;
  await prisma.chatMembership.createMany({
    data: topics.map((topic) => ({
      userId: user.uuid,
      chatId: topic.uuid,
      chatPermission: ChatMembershipPermission.MEMBER,
    })),
    skipDuplicates: true,
  });
};

/** A Ressort a post can be forwarded to: a function and who holds it now. */
export interface ForumRessort {
  id: string;
  label: string;
  holders: string[];
}

/**
 * The functions of Funktionen und Adressbuch that someone holds, in their order, for the
 * Weiterleiten sheet. Only for whoever may forward, a moderator of at least one topic.
 */
export const getForumRessortList = trpcBaseProcedure
  .input(z.object({}))
  .query(async ({ ctx }): Promise<ForumRessort[]> => {
    const moderated = await findModeratedTopicIds(ctx.prisma, ctx.user);
    if (moderated !== 'all' && moderated.length === 0) throw forumError('FORBIDDEN', 'notAllowed');
    const directory = await getFunktionDirectory(await getPayload({ config }), ctx.locale);
    const holders = await ctx.prisma.user.findMany({
      where: { funktionIds: { hasSome: [...directory.keys()] } },
      select: { name: true, funktionIds: true },
      orderBy: { name: 'asc' },
    });
    return [...directory]
      .map(([id, funktion]) => ({
        id,
        label: funktion.label,
        order: funktion.order,
        holders: holders
          .filter((holder) => holder.funktionIds.includes(id))
          .map((holder) => holder.name),
      }))
      .filter((ressort) => ressort.holders.length > 0 && ressort.label !== '')
      .toSorted((a, b) => a.order - b.order)
      .map(({ id, label, holders: names }) => ({ id, label, holders: names }));
  });
