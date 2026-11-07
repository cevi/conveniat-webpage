import { forumError } from '@/features/chat/api/forum/forum-errors';
import {
  findModeratedTopicIds,
  isFullModerator,
  resolveForumModerator,
} from '@/features/chat/api/forum/forum-moderator';
import {
  FORUM_POST_SUMMARY_SELECT,
  type ForumPostSummary,
  readForumPostContent,
  toForumPostSummaries,
  visibleForumPostsWhere,
} from '@/features/chat/api/forum/forum-posts';
import {
  findForumPostsMatching,
  type ForumSuggestion,
  rankForumSuggestions,
  searchWordsOf,
} from '@/features/chat/api/forum/forum-search';
import {
  findPrivateReportTopicId,
  isRestrictedForumPost,
} from '@/features/chat/api/forum/forum-visibility';
import { countZentrale, ensureZentraleMemberships } from '@/features/chat/api/forum/forum-zentrale';
import { getFunktionDirectory } from '@/features/payload-cms/payload-cms/utils/funktionen';
import { getFeatureFlag } from '@/lib/db/redis';
import { FEATURE_FLAG_FORUM_MODERATION } from '@/lib/feature-flags';
import {
  distanceInMetres,
  FORUM_LIKE_EMOJI,
  FORUM_NEARBY_RADIUS_METRES,
  FORUM_POST_STATUSES,
  type ForumCapacityValue,
  type ForumPostStatusValue,
} from '@/lib/forum-shared';
import { type Prisma } from '@/lib/prisma/client';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma/enums';
import { trpcBaseProcedure } from '@/trpc/init';
import type { Locale } from '@/types/types';
import config from '@payload-config';
import { getPayload } from 'payload';
import { z } from 'zod';

const pointSchema = z.object({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
});

/** A box around a point, wide enough for `radiusMetres`; filtered exactly afterwards. */
const boxAround = (
  point: z.infer<typeof pointSchema>,
  radiusMetres: number,
): Prisma.ForumPostWhereInput => {
  const dLat = radiusMetres / 111_320;
  const dLng =
    radiusMetres / (111_320 * Math.max(Math.cos((point.latitude * Math.PI) / 180), 0.01));
  return {
    latitude: { gte: point.latitude - dLat, lte: point.latitude + dLat },
    longitude: { gte: point.longitude - dLng, lte: point.longitude + dLng },
  };
};

export interface ForumTopic {
  id: string;
  name: string;
  description: string | null;
  subscribed: boolean;
  muted: boolean;
  /** the caller is one of the topic's admins, its Kernteam */
  isAdmin: boolean;
  openPostCount: number;
}

/** The topics the caller belongs to, in the order the editors created them. */
export const getForumTopicList = trpcBaseProcedure
  .input(z.object({}))
  .query(async ({ ctx }): Promise<ForumTopic[]> => {
    const memberships = await ctx.prisma.chatMembership.findMany({
      where: { userId: ctx.user.uuid, chat: { type: ChatType.FORUM, archivedAt: null } },
      select: {
        subscribedAt: true,
        mutedAt: true,
        chatPermission: true,
        chat: { select: { uuid: true, name: true, description: true, createdAt: true } },
      },
      orderBy: { chat: { createdAt: 'asc' } },
    });
    const openCounts = await ctx.prisma.forumPost.groupBy({
      by: ['chatId'],
      where: {
        chatId: { in: memberships.map((membership) => membership.chat.uuid) },
        status: { not: 'DONE' },
        mergedIntoId: null,
        message: { deletedAt: null },
      },
      _count: { _all: true },
    });
    const openCountOf = new Map(openCounts.map((group) => [group.chatId, group._count._all]));
    return memberships.map((membership) => ({
      id: membership.chat.uuid,
      name: membership.chat.name,
      description: membership.chat.description,
      subscribed: membership.subscribedAt !== null,
      muted: membership.mutedAt !== null,
      isAdmin:
        membership.chatPermission === ChatMembershipPermission.OWNER ||
        membership.chatPermission === ChatMembershipPermission.ADMIN,
      openPostCount: openCountOf.get(membership.chat.uuid) ?? 0,
    }));
  });

const LIST_PAGE_SIZE = 20;

/**
 * Posts of the caller's topics, newest or most liked first, pinned ones on top of a topic. The
 * cursor is an offset: a list sorted by likes has no stable key, and a forum stays small enough.
 */
export const getForumPostList = trpcBaseProcedure
  .input(
    z.object({
      topicId: z.uuid().optional(),
      status: z.enum(['active', 'done', 'all']).default('active'),
      filter: z
        .enum(['all', 'mine', 'assignedToMe', 'subscribed', 'pending', 'private'])
        .default('all'),
      sort: z.enum(['new', 'popular']).default('new'),
      annotationId: z.string().max(64).optional(),
      cursor: z.number().int().min(0).nullish(),
      limit: z.number().int().min(1).max(50).default(LIST_PAGE_SIZE),
    }),
  )
  .query(
    async ({ ctx, input }): Promise<{ items: ForumPostSummary[]; nextCursor: number | null }> => {
      const userId = ctx.user.uuid;
      const offset = input.cursor ?? 0;
      const moderated = await findModeratedTopicIds(ctx.prisma, ctx.user);
      const where: Prisma.ForumPostWhereInput = {
        AND: [
          visibleForumPostsWhere(userId, moderated),
          input.filter === 'pending' ? { approvedAt: null } : {},
          input.filter === 'private' ? { private: true } : {},
        ],
        ...(input.topicId === undefined ? {} : { chatId: input.topicId }),
        ...(input.annotationId === undefined ? {} : { annotationId: input.annotationId }),
        ...(input.status === 'active' ? { status: { not: 'DONE' } } : {}),
        ...(input.status === 'done' ? { status: 'DONE' } : {}),
        ...(input.filter === 'mine' ? { message: { senderId: userId, deletedAt: null } } : {}),
        ...(input.filter === 'assignedToMe'
          ? { assignments: { some: { assigneeId: userId, endedAt: null } } }
          : {}),
        ...(input.filter === 'subscribed'
          ? { message: { deletedAt: null, threadSubscriptions: { some: { userId } } } }
          : {}),
      };

      let rows;
      if (input.sort === 'popular') {
        // likes live in another table, so rank the ids first and read the page after
        const candidates = await ctx.prisma.forumPost.findMany({
          where,
          select: {
            messageId: true,
            createdAt: true,
            message: {
              select: {
                _count: { select: { reactions: { where: { emoji: FORUM_LIKE_EMOJI } } } },
              },
            },
          },
          take: 500,
          orderBy: { createdAt: 'desc' },
        });
        const ranked = candidates
          .toSorted((a, b) => {
            const byLikes = b.message._count.reactions - a.message._count.reactions;
            return byLikes === 0 ? b.createdAt.getTime() - a.createdAt.getTime() : byLikes;
          })
          .slice(offset, offset + input.limit + 1)
          .map((candidate) => candidate.messageId);
        const page = await ctx.prisma.forumPost.findMany({
          where: { messageId: { in: ranked } },
          select: FORUM_POST_SUMMARY_SELECT,
        });
        const byId = new Map(page.map((row) => [row.messageId, row]));
        rows = ranked.map((id) => byId.get(id)).filter((row) => row !== undefined);
      } else {
        rows = await ctx.prisma.forumPost.findMany({
          where,
          select: FORUM_POST_SUMMARY_SELECT,
          orderBy: [
            ...(input.topicId === undefined
              ? []
              : [{ pinnedAt: { sort: 'desc' as const, nulls: 'last' as const } }]),
            { createdAt: 'desc' },
          ],
          skip: offset,
          take: input.limit + 1,
        });
      }

      const hasMore = rows.length > input.limit;
      const items = await toForumPostSummaries(
        ctx.prisma,
        userId,
        rows.slice(0, input.limit),
        ctx.locale,
      );
      return { items, nextCursor: hasMore ? offset + input.limit : null };
    },
  );

/** The pinned posts of the topics the caller belongs to, the Kernteam's on top of the feed. */
export const getForumPinnedPostList = trpcBaseProcedure
  .input(z.object({ topicId: z.uuid().optional() }))
  .query(async ({ ctx, input }): Promise<ForumPostSummary[]> => {
    const moderated = await findModeratedTopicIds(ctx.prisma, ctx.user);
    const rows = await ctx.prisma.forumPost.findMany({
      where: {
        AND: [visibleForumPostsWhere(ctx.user.uuid, moderated)],
        ...(input.topicId === undefined ? {} : { chatId: input.topicId }),
        pinnedAt: { not: null },
      },
      select: FORUM_POST_SUMMARY_SELECT,
      orderBy: { pinnedAt: 'desc' },
      take: 5,
    });
    return toForumPostSummaries(ctx.prisma, ctx.user.uuid, rows, ctx.locale);
  });

/**
 * Posts that may already report what the composer is about to: open ones near the chosen place,
 * and open ones whose title or description matches the title typed so far, see `forum-search`.
 * Recently done posts stay in for two days, so a fix that just happened is seen before it is
 * reported again.
 */
export const getForumPostSuggestionList = trpcBaseProcedure
  .input(
    z.object({
      topicId: z.uuid().optional(),
      title: z.string().max(200).optional(),
      near: pointSchema.optional(),
    }),
  )
  .query(async ({ ctx, input }): Promise<ForumSuggestion[]> => {
    const words = searchWordsOf(input.title ?? '');
    if (words.length === 0 && input.near === undefined) return [];

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const [moderated, scores] = await Promise.all([
      findModeratedTopicIds(ctx.prisma, ctx.user),
      findForumPostsMatching(ctx.prisma, ctx.user.uuid, words, input.topicId),
    ]);
    const near = input.near;
    if (scores.size === 0 && near === undefined) return [];
    const rows = await ctx.prisma.forumPost.findMany({
      where: {
        ...(input.topicId === undefined ? {} : { chatId: input.topicId }),
        OR: [{ status: { not: 'DONE' } }, { statusChangedAt: { gte: twoDaysAgo } }],
        AND: [
          visibleForumPostsWhere(ctx.user.uuid, moderated),
          {
            OR: [
              ...(scores.size === 0 ? [] : [{ messageId: { in: [...scores.keys()] } }]),
              ...(near === undefined ? [] : [boxAround(near, FORUM_NEARBY_RADIUS_METRES)]),
            ],
          },
        ],
      },
      select: FORUM_POST_SUMMARY_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 40,
    });
    const summaries = await toForumPostSummaries(ctx.prisma, ctx.user.uuid, rows, ctx.locale);
    const suggestions = summaries
      .map((summary): ForumSuggestion => ({
        ...summary,
        ...(near !== undefined && summary.location !== null
          ? { distanceMetres: Math.round(distanceInMetres(near, summary.location)) }
          : {}),
      }))
      // the box is wider than the circle around the place
      .filter(
        (summary) =>
          scores.has(summary.id) ||
          (summary.distanceMetres !== undefined &&
            summary.distanceMetres <= FORUM_NEARBY_RADIUS_METRES),
      );
    return rankForumSuggestions(suggestions, scores).slice(0, 5);
  });

/** The open posts with a place, for the forum layer of the map. */
export const getForumPostMapList = trpcBaseProcedure
  .input(z.object({}))
  .query(async ({ ctx }): Promise<ForumPostSummary[]> => {
    const moderated = await findModeratedTopicIds(ctx.prisma, ctx.user);
    const rows = await ctx.prisma.forumPost.findMany({
      where: {
        AND: [visibleForumPostsWhere(ctx.user.uuid, moderated)],
        status: { not: 'DONE' },
        latitude: { not: null },
        longitude: { not: null },
      },
      select: FORUM_POST_SUMMARY_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    return toForumPostSummaries(ctx.prisma, ctx.user.uuid, rows, ctx.locale);
  });

export interface ForumStatusChange {
  at: Date;
  status: ForumPostStatusValue;
  actorName: string;
  capacity: ForumCapacityValue;
  delegatedByName: string | null;
  note: string | null;
}

export interface ForumAssignment {
  id: string;
  /** a person, or for a forward to a Ressort the Ressort, with its holders under `holders` */
  assignee: { id: string; name: string };
  /** the holders of a Ressort it was forwarded to; missing for a person, and in older caches */
  holders?: string[];
  assignedByName: string;
  note: string | null;
  createdAt: Date;
}

/** Who said "Ich übernehme" for the post. */
export interface ForumClaim {
  id: string;
  by: { id: string; name: string };
  since: Date;
}

export interface ForumPostDetail extends ForumPostSummary {
  text: string;
  images: string[];
  answerCommentId: string | null;
  mergedInto: { id: string; title: string } | null;
  mergedPostCount: number;
  subscribed: boolean;
  topicSubscribed: boolean;
  statusHistory: ForumStatusChange[];
  assignments: ForumAssignment[];
  /** absent in a persisted cache from before the Zentrale */
  claim?: ForumClaim | null;
  /** the caller's own open forward of the post, which they can hand back */
  myForward?: {
    id: string;
    byName: string;
    note: string | null;
    /** the Ressort it went to, for a forward to a Ressort */
    ressort: string | null;
  } | null;
  /** what the caller may do with the post */
  viewer: {
    capacity: ForumCapacityValue | null;
    /** status changes; a helper may, for this one post */
    canSetStatus: boolean;
    /** pin, answer, merge, delete, assign */
    canModerate: boolean;
    /** the post waits for approval, and the caller may give it */
    canApprove: boolean;
    isAuthor: boolean;
    /** "Ich übernehme": whoever handles posts here, someone it was forwarded to included */
    canClaim?: boolean;
    /** into another topic: a moderator, for a post that is no private report */
    canMove?: boolean;
  };
}

const statusOf = (value: unknown): ForumPostStatusValue | undefined => {
  const status = (value as { status?: unknown } | null)?.status;
  return FORUM_POST_STATUSES.find((candidate) => candidate === status);
};

/**
 * The open forwards of a post as its page lists them: a person, or a Ressort once, under its
 * function's label, with its holders.
 */
const describeForwards = async (
  forwards: {
    id: string;
    funktionId: string | null;
    note: string | null;
    createdAt: Date;
    assignee: { uuid: string; name: string };
    assignedBy: { name: string };
  }[],
  locale: Locale,
): Promise<ForumAssignment[]> => {
  const labels = forwards.some((forward) => forward.funktionId !== null)
    ? await getFunktionDirectory(await getPayload({ config }), locale)
    : new Map<string, { label: string }>();
  const byRessort = new Map<string, ForumAssignment>();
  const described: ForumAssignment[] = [];
  for (const forward of forwards) {
    if (forward.funktionId === null) {
      described.push({
        id: forward.id,
        assignee: { id: forward.assignee.uuid, name: forward.assignee.name },
        assignedByName: forward.assignedBy.name,
        note: forward.note,
        createdAt: forward.createdAt,
      });
      continue;
    }
    const known = byRessort.get(forward.funktionId);
    if (known !== undefined) {
      known.holders?.push(forward.assignee.name);
      continue;
    }
    const entry: ForumAssignment = {
      id: forward.id,
      assignee: {
        id: forward.funktionId,
        name: labels.get(forward.funktionId)?.label ?? forward.assignee.name,
      },
      holders: [forward.assignee.name],
      assignedByName: forward.assignedBy.name,
      note: forward.note,
      createdAt: forward.createdAt,
    };
    byRessort.set(forward.funktionId, entry);
    described.push(entry);
  }
  return described;
};

/**
 * One post with everything its page shows, but not its comments: those are the thread of its
 * message and come from `chat.infiniteMessages`, like any thread.
 */
export const getForumPost = trpcBaseProcedure
  .input(z.object({ postId: z.uuid() }))
  .query(async ({ ctx, input }): Promise<ForumPostDetail> => {
    const userId = ctx.user.uuid;
    const row = await ctx.prisma.forumPost.findFirst({
      where: {
        messageId: input.postId,
        message: { deletedAt: null },
        chat: { type: ChatType.FORUM, chatMemberships: { some: { userId } } },
      },
      select: {
        ...FORUM_POST_SUMMARY_SELECT,
        answerMessageId: true,
        mergedIntoId: true,
        chat: {
          select: {
            name: true,
            chatMemberships: { where: { userId }, select: { subscribedAt: true } },
          },
        },
      },
    });
    // a stale link or a persisted cache after the post was deleted or the caller left the topic
    if (row === null) throw forumError('NOT_FOUND', 'postGone');

    const [summary] = await toForumPostSummaries(ctx.prisma, userId, [row], ctx.locale);
    if (summary === undefined) throw forumError('NOT_FOUND', 'postGone');

    const [mergedInto, mergedPostCount, subscription, history, assignments, moderator] =
      await Promise.all([
        row.mergedIntoId === null
          ? Promise.resolve(null)
          : ctx.prisma.forumPost.findUnique({
              where: { messageId: row.mergedIntoId },
              select: { messageId: true, title: true },
            }),
        ctx.prisma.forumPost.count({ where: { mergedIntoId: row.messageId } }),
        ctx.prisma.threadSubscription.findUnique({
          where: { userId_messageId: { userId, messageId: row.messageId } },
        }),
        ctx.prisma.forumAuditEvent.findMany({
          where: { messageId: row.messageId, action: 'STATUS_CHANGED' },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            createdAt: true,
            actorName: true,
            capacity: true,
            delegatedByName: true,
            after: true,
            note: true,
          },
        }),
        ctx.prisma.forumPostAssignment.findMany({
          where: { messageId: row.messageId, endedAt: null },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            kind: true,
            funktionId: true,
            note: true,
            createdAt: true,
            assignee: { select: { uuid: true, name: true } },
            assignedBy: { select: { name: true } },
          },
        }),
        resolveForumModerator(ctx.prisma, ctx.user, row.chatId, row.messageId),
      ]);

    // a private report or a post waiting for approval answers like one that does not exist, but
    // to its author and its moderators
    if (
      isRestrictedForumPost(row) &&
      row.message.senderId !== userId &&
      !isFullModerator(moderator)
    ) {
      throw forumError('NOT_FOUND', 'postGone');
    }

    const content = readForumPostContent(row.message.contentVersions[0]?.payload);
    const claim = assignments.find((assignment) => assignment.kind === 'CLAIM');
    const helpers = assignments.filter((assignment) => assignment.kind === 'HELPER');
    const forwards = await describeForwards(helpers, ctx.locale);
    const myForward = helpers.find((assignment) => assignment.assignee.uuid === userId);
    return {
      ...summary,
      text: content.text,
      images: content.images,
      answerCommentId: row.answerMessageId,
      mergedInto:
        mergedInto === null ? null : { id: mergedInto.messageId, title: mergedInto.title },
      mergedPostCount,
      subscribed: subscription !== null,
      topicSubscribed: row.chat.chatMemberships[0]?.subscribedAt != undefined,
      statusHistory: history.flatMap((event) => {
        const status = statusOf(event.after);
        return status === undefined
          ? []
          : [
              {
                at: event.createdAt,
                status,
                actorName: event.actorName,
                capacity: event.capacity,
                delegatedByName: event.delegatedByName,
                note: event.note,
              },
            ];
      }),
      assignments: forwards,
      claim:
        claim === undefined
          ? null
          : {
              id: claim.id,
              by: { id: claim.assignee.uuid, name: claim.assignee.name },
              since: claim.createdAt,
            },
      myForward:
        myForward === undefined
          ? null
          : {
              id: myForward.id,
              byName: myForward.assignedBy.name,
              note: myForward.note,
              ressort:
                myForward.funktionId === null
                  ? null
                  : (forwards.find((forward) => forward.assignee.id === myForward.funktionId)
                      ?.assignee.name ?? null),
            },
      viewer: {
        capacity: moderator?.capacity ?? null,
        canSetStatus: moderator !== undefined && row.mergedIntoId === null,
        canModerate: isFullModerator(moderator),
        canApprove: row.approvedAt === null && isFullModerator(moderator),
        isAuthor: summary.author?.id === userId,
        canClaim: moderator !== undefined && row.mergedIntoId === null && row.status !== 'DONE',
        canMove: isFullModerator(moderator) && row.mergedIntoId === null && row.private !== true,
      },
    };
  });

/**
 * People a moderator can hand a post to: anyone who has logged in to the app once, found by
 * name. Not limited to the caller's contacts, since the piket has to reach helpers they never
 * met. Only for someone who may assign in the topic, so it is no directory for everybody.
 */
export const getForumAssigneeList = trpcBaseProcedure
  .input(z.object({ topicId: z.uuid(), query: z.string().trim().min(2).max(60) }))
  .query(async ({ ctx, input }): Promise<{ id: string; name: string }[]> => {
    const moderator = await resolveForumModerator(ctx.prisma, ctx.user, input.topicId);
    if (!isFullModerator(moderator)) throw forumError('FORBIDDEN', 'notAllowed');
    const users = await ctx.prisma.user.findMany({
      where: { name: { contains: input.query, mode: 'insensitive' }, hidden: false },
      select: { uuid: true, name: true },
      orderBy: { name: 'asc' },
      take: 10,
    });
    return users.map((user) => ({ id: user.uuid, name: user.name }));
  });

export interface ForumSettings {
  /** the admin panel's switch: new posts wait for a moderator */
  moderationRequired: boolean;
  /** the caller moderates at least one topic, as its Kernteam or on piket duty */
  canModerate: boolean;
  /** the caller holds an open assignment, so "Meine Aufträge" has something to show */
  hasOpenAssignments: boolean;
  /** editors chose a topic for private reports, so the composer offers "Privat" */
  privateReportsAvailable: boolean;
  /** the Zentrale's counts, for whoever handles posts or has one forwarded; null for others */
  zentrale?: { waiting: number; mine: number } | null;
}

/**
 * What the forum's pages need to know beyond the posts: the admin panel's switch, and which of
 * the filters apply to the caller at all, so a participant sees only the ones that do.
 */
export const getForumSettings = trpcBaseProcedure
  .input(z.object({}))
  .query(async ({ ctx }): Promise<ForumSettings> => {
    // every page of the forum asks for these first, so the Zentrale's memberships are there
    // before it reads a topic
    await ensureZentraleMemberships(ctx.prisma, ctx.user);
    const [moderationRequired, moderated, openAssignments, privateReportTopicId] =
      await Promise.all([
        getFeatureFlag(FEATURE_FLAG_FORUM_MODERATION),
        findModeratedTopicIds(ctx.prisma, ctx.user),
        ctx.prisma.forumPostAssignment.count({
          where: { assigneeId: ctx.user.uuid, endedAt: null, kind: 'HELPER' },
        }),
        findPrivateReportTopicId(),
      ]);
    return {
      moderationRequired,
      canModerate: moderated === 'all' || moderated.length > 0,
      hasOpenAssignments: openAssignments > 0,
      privateReportsAvailable: privateReportTopicId !== undefined,
      zentrale: await countZentrale(ctx.prisma, ctx.user, moderated),
    };
  });
