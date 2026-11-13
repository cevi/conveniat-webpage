import { forumError } from '@/features/chat/api/forum/forum-errors';
import {
  findModeratedTopicIds,
  type ForumUser,
  isForumZentrale,
  resolveForumModerator,
} from '@/features/chat/api/forum/forum-moderator';
import {
  FORUM_POST_SUMMARY_SELECT,
  type ForumPostSummaryRow,
  markForumPostReacted,
  type ModeratedTopics,
  toForumPostSummaries,
  visibleForumPostsWhere,
} from '@/features/chat/api/forum/forum-posts';
import { getFunktionDirectory } from '@/features/payload-cms/payload-cms/utils/funktionen';
import type { ForumPostSummary } from '@/lib/forum-shared';
import { FORUM_TODO_SECTION_SIZE } from '@/lib/forum-shared';
import type { Prisma } from '@/lib/prisma/client';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma/enums';
import { trpcBaseProcedure } from '@/trpc/init';
import type { Locale, PrismaClientOrTransaction } from '@/types/types';
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

/** Open flags or a request for review, on a post or on one of its comments. */
const flaggedWhere: Prisma.ForumPostWhereInput = {
  OR: [
    { message: { forumFlags: { some: { resolvedAt: null } } } },
    { message: { forumRemoval: { is: { kind: 'HIDDEN', reviewRequestedAt: { not: null } } } } },
    {
      message: {
        replies: {
          some: {
            OR: [
              { forumFlags: { some: { resolvedAt: null } } },
              { forumRemoval: { is: { kind: 'HIDDEN', reviewRequestedAt: { not: null } } } },
            ],
          },
        },
      },
    },
  ],
};

/** The open private conversations of the topics someone moderates. */
const conversationsWhere = (moderated: ModeratedTopics): Prisma.ForumPostWhereInput => ({
  status: { not: 'DONE' },
  message: { deletedAt: null },
  chat: {
    type: ChatType.FORUM_CONVERSATION,
    status: 'OPEN',
    ...(moderated === 'all' ? {} : { forumTopicId: { in: moderated } }),
  },
});

/** What the "Zu tun" button counts: everything that waits for the caller to act. */
export const countZentrale = async (
  prisma: PrismaClientOrTransaction,
  user: ForumUser,
  moderated: ModeratedTopics,
): Promise<{ waiting: number; mine: number } | null> => {
  const moderates = moderated === 'all' || moderated.length > 0;
  const visible = visibleForumPostsWhere(user.uuid, moderated);
  const scope = moderated === 'all' ? {} : { chatId: { in: moderated } };
  const [waiting, flagged, conversations, mine] = await Promise.all([
    moderates
      ? prisma.forumPost.count({
          where: {
            AND: [visible, tabWhere('waiting', user.uuid, moderated), { NOT: flaggedWhere }],
          },
        })
      : 0,
    moderates ? prisma.forumPost.count({ where: { AND: [visible, scope, flaggedWhere] } }) : 0,
    moderates
      ? prisma.forumPost.count({ where: { ...conversationsWhere(moderated), reactedAt: null } })
      : 0,
    prisma.forumPost.count({ where: { AND: [visible, tabWhere('mine', user.uuid, moderated)] } }),
  ]);
  // nothing to moderate and nothing forwarded: no Zentrale for this person
  if (!moderates && mine === 0) return null;
  return { waiting: waiting + flagged + conversations, mine };
};

/** The post a message belongs to: itself, or the post a comment answers. */
const postOf = (message: { uuid: string; parentId: string | null }): string =>
  message.parentId ?? message.uuid;

/** A post in "Zu tun", with why it is there. */
export interface ForumTodoPost extends ZentralePost {
  /** open flags on the post and its comments together */
  openFlags?: number;
  /** the author revised a hidden post and asks to show it again */
  reviewRequested?: boolean;
  /** a private conversation, for the conversations' section */
  conversation?: { topicName: string } | null;
}

export interface ForumTodoList {
  flagged: ForumTodoPost[];
  conversations: ForumTodoPost[];
  waiting: ForumTodoPost[];
  mine: ForumTodoPost[];
  /**
   * how many each section holds in all; a section shows the first `limits` of them. Absent in a
   * persisted cache from before
   */
  totals?: Record<ForumTodoSection, number>;
  /** the caller moderates every topic, on piket duty or at the Zentrale, and can widen the list */
  canSeeAll: boolean;
}

export type ForumTodoSection = 'flagged' | 'conversations' | 'waiting' | 'mine';

const TODO_SECTION_MAX = 1000;
const sectionLimit = z.number().int().min(1).max(TODO_SECTION_MAX).optional();

/**
 * "Zu tun": what waits for the caller, by urgency: flags and requests for review, private
 * conversations, posts without a reaction, and what was forwarded to them. `scope: 'mine'`
 * keeps to the topics whose Kernteam the caller is, `all` takes every topic they moderate.
 */
export const getForumTodoList = trpcBaseProcedure
  .input(
    z.object({
      scope: z.enum(['mine', 'all']).default('mine'),
      /** how many posts each section shows, raised by its "Mehr laden" */
      limits: z
        .object({
          flagged: sectionLimit,
          conversations: sectionLimit,
          waiting: sectionLimit,
          mine: sectionLimit,
        })
        .default({}),
    }),
  )
  .query(async ({ ctx, input }): Promise<ForumTodoList> => {
    const userId = ctx.user.uuid;
    const everything = await findModeratedTopicIds(ctx.prisma, ctx.user);
    const kernteamMemberships = await ctx.prisma.chatMembership.findMany({
      where: {
        userId,
        chatPermission: { in: [ChatMembershipPermission.OWNER, ChatMembershipPermission.ADMIN] },
        chat: { type: ChatType.FORUM, archivedAt: null },
      },
      select: { chatId: true },
    });
    const kernteamTopics = kernteamMemberships.map((membership) => membership.chatId);
    const canSeeAll = everything === 'all';
    const moderated: ModeratedTopics =
      input.scope === 'all' || !canSeeAll ? everything : kernteamTopics;
    const visible = visibleForumPostsWhere(userId, everything);
    const scope = moderated === 'all' ? {} : { chatId: { in: moderated } };
    const moderates = moderated === 'all' || moderated.length > 0;
    const select = { ...FORUM_POST_SUMMARY_SELECT, reactedAt: true } as const;

    const where: Record<ForumTodoSection, Prisma.ForumPostWhereInput> = {
      flagged: { AND: [visible, scope, flaggedWhere] },
      conversations: conversationsWhere(moderated),
      // a flagged post stands under "Gemeldet" alone
      waiting: { AND: [visible, tabWhere('waiting', userId, moderated), { NOT: flaggedWhere }] },
      mine: { AND: [visible, tabWhere('mine', userId, moderated)] },
    };
    const countOf = (section: ForumTodoSection): Promise<number> =>
      moderates || section === 'mine'
        ? ctx.prisma.forumPost.count({ where: where[section] })
        : Promise.resolve(0);
    const totalsPromise = Promise.all([
      countOf('flagged'),
      countOf('conversations'),
      countOf('waiting'),
      countOf('mine'),
    ]);

    const [flaggedRows, conversationRows, waitingRows, mineRows] = await Promise.all([
      moderates
        ? ctx.prisma.forumPost.findMany({
            where: where.flagged,
            select,
            orderBy: { createdAt: 'asc' },
            take: input.limits.flagged ?? FORUM_TODO_SECTION_SIZE,
          })
        : [],
      moderates
        ? ctx.prisma.forumPost.findMany({
            where: where.conversations,
            select,
            // what waits for a first answer first, then the oldest
            orderBy: [{ reactedAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }],
            take: input.limits.conversations ?? FORUM_TODO_SECTION_SIZE,
          })
        : [],
      moderates
        ? ctx.prisma.forumPost.findMany({
            where: where.waiting,
            select,
            orderBy: { createdAt: 'asc' },
            take: input.limits.waiting ?? FORUM_TODO_SECTION_SIZE,
          })
        : [],
      ctx.prisma.forumPost.findMany({
        where: where.mine,
        select,
        orderBy: { createdAt: 'asc' },
        take: input.limits.mine ?? FORUM_TODO_SECTION_SIZE,
      }),
    ]);

    const flaggedIds = flaggedRows.map((row) => row.messageId);
    const [flagCounts, reviews] = await Promise.all([
      flaggedIds.length === 0
        ? []
        : ctx.prisma.forumFlag.findMany({
            where: {
              resolvedAt: null,
              message: { OR: [{ uuid: { in: flaggedIds } }, { parentId: { in: flaggedIds } }] },
            },
            select: { message: { select: { uuid: true, parentId: true } } },
          }),
      flaggedIds.length === 0
        ? []
        : ctx.prisma.forumRemoval.findMany({
            where: {
              kind: 'HIDDEN',
              reviewRequestedAt: { not: null },
              message: { OR: [{ uuid: { in: flaggedIds } }, { parentId: { in: flaggedIds } }] },
            },
            select: { message: { select: { uuid: true, parentId: true } } },
          }),
    ]);
    const conversationChats = await ctx.prisma.chat.findMany({
      where: { uuid: { in: conversationRows.map((row) => row.chatId) } },
      select: { uuid: true, forumTopic: { select: { name: true } } },
    });
    const topicNames = new Map(
      conversationChats.map((chat) => [chat.uuid, chat.forumTopic?.name ?? '']),
    );

    const toItems = async (
      rows: (typeof waitingRows)[number][],
      extra?: (row: (typeof waitingRows)[number]) => Partial<ForumTodoPost>,
    ): Promise<ForumTodoPost[]> => {
      const items = await describeQueue(ctx.prisma, userId, rows, ctx.locale, everything);
      return items.map((item, index) => {
        const row = rows[index];
        return row === undefined || extra === undefined ? item : { ...item, ...extra(row) };
      });
    };

    const [flagged, conversations, waiting, mine] = await Promise.all([
      toItems(flaggedRows, (row) => ({
        openFlags: flagCounts.filter((flag) => postOf(flag.message) === row.messageId).length,
        reviewRequested: reviews.some((review) => postOf(review.message) === row.messageId),
      })),
      toItems(conversationRows, (row) => ({
        conversation: { topicName: topicNames.get(row.chatId) ?? '' },
      })),
      toItems(waitingRows),
      toItems(mineRows),
    ]);
    const [flaggedTotal, conversationsTotal, waitingTotal, mineTotal] = await totalsPromise;
    return {
      flagged,
      conversations,
      waiting,
      mine,
      totals: {
        flagged: flaggedTotal,
        conversations: conversationsTotal,
        waiting: waitingTotal,
        mine: mineTotal,
      },
      canSeeAll,
    };
  });

/** Queue rows as the queue shows them: the summary, who took it and where it was forwarded. */
const describeQueue = async (
  prisma: PrismaClientOrTransaction,
  userId: string,
  page: (ForumPostSummaryRow & { reactedAt: Date | null })[],
  locale: Locale,
  moderated: ModeratedTopics,
): Promise<ZentralePost[]> => {
  const [summaries, assignments] = await Promise.all([
    toForumPostSummaries(prisma, userId, page, locale, moderated),
    prisma.forumPostAssignment.findMany({
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
    ? await getFunktionDirectory(await getPayload({ config }), locale)
    : new Map<string, { label: string }>();

  return summaries.map((summary): ZentralePost => {
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
};

/**
 * One tab of the queue of the release before "Zu tun", oldest first, kept for its persisted
 * pages. For whoever handles posts in a topic, and for anyone something was forwarded to.
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
    const items = await describeQueue(ctx.prisma, userId, page, ctx.locale, moderated);
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
