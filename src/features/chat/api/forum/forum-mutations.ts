import { assertWriteAbilities } from '@/features/chat/api/checks/assert-can-write-in-chat';
import { forumError } from '@/features/chat/api/forum/forum-errors';
import {
  type ForumModerator,
  isFullModerator,
  recordForumAuditEvent,
  resolveForumModerator,
} from '@/features/chat/api/forum/forum-moderator';
import { readForumPostContent } from '@/features/chat/api/forum/forum-posts';
import {
  pushForumModerators,
  pushForumPerson,
  pushForumThread,
  pushNewForumPost,
} from '@/features/chat/api/forum/forum-push';
import { findPrivateReportTopicId } from '@/features/chat/api/forum/forum-visibility';
import { isImageKeyOfChat } from '@/lib/chat-images';
import { chatPubSub } from '@/lib/db/chat-pubsub';
import { getFeatureFlag } from '@/lib/db/redis';
import { FEATURE_FLAG_FORUM_ENABLED, FEATURE_FLAG_FORUM_MODERATION } from '@/lib/feature-flags';
import {
  FORUM_NOTE_MAX_LENGTH,
  FORUM_POST_MAX_IMAGES,
  FORUM_POST_STATUSES,
  FORUM_TEXT_MAX_LENGTH,
  FORUM_TITLE_MAX_LENGTH,
  forumCapacityLabel,
  type ForumPostStatusValue,
  forumStatusLabel,
} from '@/lib/forum-shared';
import {
  ChatMembershipPermission,
  ChatType,
  MessageEventType,
  MessageType,
} from '@/lib/prisma/client';
import { invariantError } from '@/trpc/error-formatter';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { rateLimit } from '@/trpc/middleware/rate-limit';
import type { Locale, PrismaClientOrTransaction, StaticTranslationString } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import { z } from 'zod';

const logger = createLogger('forum:mutations');

const assignedText = (actor: string, capacity: string): StaticTranslationString => ({
  de: `Neuer Auftrag von ${actor} (${capacity})`,
  en: `New assignment from ${actor} (${capacity})`,
  fr: `Nouvelle mission de ${actor} (${capacity})`,
});

const assignmentEndedText = (actor: string): StaticTranslationString => ({
  de: `${actor} hat deinen Auftrag zurückgezogen.`,
  en: `${actor} withdrew your assignment.`,
  fr: `${actor} a retiré ta mission.`,
});

const pendingText = (title: string): StaticTranslationString => ({
  de: `Wartet auf Freigabe: ${title}`,
  en: `Waiting for approval: ${title}`,
  fr: `En attente d’approbation : ${title}`,
});

const privateReportText = (title: string): StaticTranslationString => ({
  de: `Neue private Meldung: ${title}`,
  en: `New private report: ${title}`,
  fr: `Nouveau signalement privé : ${title}`,
});

const mergedText = (title: string): StaticTranslationString => ({
  de: `Zusammengeführt mit «${title}». Updates kommen ab jetzt von dort.`,
  en: `Merged into "${title}". Updates come from there from now on.`,
  fr: `Fusionné avec « ${title} ». Les nouvelles viendront désormais de là.`,
});

const statusPushText = (
  status: ForumPostStatusValue,
  note: string | undefined,
  locale: Locale,
): string => {
  const label = forumStatusLabel[status][locale];
  return note === undefined ? `Status: ${label}` : `Status: ${label}. ${note}`;
};

/** Moderation is cheap per call but each one may push, so a runaway client is stopped here. */
const moderationLimit = rateLimit({
  name: 'forum.moderate',
  limit: 60,
  windowMs: 60 * 1000,
  refuse: () => forumError('TOO_MANY_REQUESTS', 'tooManyChanges'),
});

const optionalNote = z
  .string()
  .trim()
  .max(FORUM_NOTE_MAX_LENGTH)
  .optional()
  .transform((note) => (note === '' ? undefined : note));

interface LoadedPost {
  messageId: string;
  chatId: string;
  title: string;
  status: ForumPostStatusValue;
  statusChangedById: string | null;
  mergedIntoId: string | null;
  pinnedAt: Date | null;
  answerMessageId: string | null;
  senderId: string | null;
  topicName: string;
}

/**
 * The post a moderation call is about. A post deleted since is a reason, not an invariant: a
 * stale page or the offline outbox replays calls for it.
 */
const loadPost = async (prisma: PrismaClientOrTransaction, postId: string): Promise<LoadedPost> => {
  const post = await prisma.forumPost.findUnique({
    where: { messageId: postId },
    select: {
      messageId: true,
      chatId: true,
      title: true,
      status: true,
      statusChangedById: true,
      mergedIntoId: true,
      pinnedAt: true,
      answerMessageId: true,
      chat: { select: { name: true, type: true } },
      message: { select: { senderId: true, deletedAt: true } },
    },
  });
  if (post?.message.deletedAt !== null || post.chat.type !== ChatType.FORUM) {
    throw forumError('NOT_FOUND', 'postGone');
  }
  return {
    messageId: post.messageId,
    chatId: post.chatId,
    title: post.title,
    status: post.status,
    statusChangedById: post.statusChangedById,
    mergedIntoId: post.mergedIntoId,
    pinnedAt: post.pinnedAt,
    answerMessageId: post.answerMessageId,
    senderId: post.message.senderId,
    topicName: post.chat.name,
  };
};

/** Refuses anyone who may not moderate the post, in a way their client can explain. */
const requireModerator = async (
  prisma: PrismaClientOrTransaction,
  userId: string,
  post: LoadedPost,
  full: boolean,
): Promise<ForumModerator> => {
  const moderator = await resolveForumModerator(prisma, userId, post.chatId, post.messageId);
  if (moderator === undefined || (full && !isFullModerator(moderator))) {
    throw forumError('FORBIDDEN', 'notAllowed');
  }
  return moderator;
};

/**
 * Ends every open assignment of a post, when it is done or withdrawn, and takes back the
 * memberships the assignments added: the helper belonged to the topic only for the task.
 */
const endAssignments = async (
  prisma: PrismaClientOrTransaction,
  where: { messageId: string; id?: string },
  endedById: string,
): Promise<{ assigneeId: string; id: string }[]> => {
  const open = await prisma.forumPostAssignment.findMany({
    where: { ...where, endedAt: null },
    select: {
      id: true,
      assigneeId: true,
      addedMembership: true,
      post: { select: { chatId: true } },
    },
  });
  if (open.length === 0) return [];
  await prisma.forumPostAssignment.updateMany({
    where: { id: { in: open.map((assignment) => assignment.id) } },
    data: { endedAt: new Date(), endedById },
  });
  for (const assignment of open.filter((candidate) => candidate.addedMembership)) {
    const stillAssigned = await prisma.forumPostAssignment.count({
      where: {
        assigneeId: assignment.assigneeId,
        endedAt: null,
        post: { chatId: assignment.post.chatId },
      },
    });
    if (stillAssigned > 0) continue;
    await prisma.chatMembership.deleteMany({
      where: {
        userId: assignment.assigneeId,
        chatId: assignment.post.chatId,
        chatPermission: ChatMembershipPermission.MEMBER,
      },
    });
  }
  return open.map((assignment) => ({ id: assignment.id, assigneeId: assignment.assigneeId }));
};

/**
 * Makes a public post known: its pushes, and the live event for open forum pages. Right after
 * writing it, or once a moderator approved it.
 */
const announceForumPost = (post: {
  chatId: string;
  postId: string;
  title: string;
  text: string;
  rawText: string;
  images: string[];
  topicName: string;
  senderId: string;
  senderName: string;
  byTopicAdmin: boolean;
  createdAt: Date;
}): void => {
  pushNewForumPost(post);
  chatPubSub
    .publish({
      type: 'new_message',
      chatId: post.chatId,
      senderId: post.senderId,
      message: {
        id: post.postId,
        createdAt: post.createdAt,
        messagePayload: { text: post.rawText, images: post.images },
        senderId: post.senderId,
        senderName: post.senderName,
        status: MessageEventType.STORED,
        type: MessageType.TEXT_MSG,
      },
    })
    .catch((error: unknown) => {
      logger.error('Failed to publish a new forum post', {
        error,
        'chat.id': post.chatId,
        'forum.post.id': post.postId,
      });
    });
};

/**
 * Makes sure the caller can write to the topic editors chose for private reports, which most
 * participants are not in, and names it, so the composer can upload the photos of a private
 * report there before it posts. The membership stays while the caller has a private report in
 * the topic, see `findKeptMemberIds`.
 */
const joinPrivateReportTopic = async (
  prisma: PrismaClientOrTransaction,
  userId: string,
): Promise<string> => {
  const topicId = await findPrivateReportTopicId();
  if (topicId === undefined) throw forumError('FORBIDDEN', 'privateReportsUnavailable');
  await prisma.chatMembership.upsert({
    where: { userId_chatId: { userId, chatId: topicId } },
    create: { userId, chatId: topicId, chatPermission: ChatMembershipPermission.MEMBER },
    update: {},
  });
  return topicId;
};

/** The topic a private report goes to, joined, see `joinPrivateReportTopic`. */
export const getForumPrivateReportTopic = trpcBaseProcedure
  .input(z.object({}))
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx }): Promise<{ topicId: string }> => {
    if (!(await getFeatureFlag(FEATURE_FLAG_FORUM_ENABLED))) {
      throw forumError('FORBIDDEN', 'forumDisabled');
    }
    return { topicId: await joinPrivateReportTopic(ctx.prisma, ctx.user.uuid) };
  });

/**
 * Writes a post: a top-level message in the topic's chat, its `ForumPost` row, and the author's
 * subscription to it. Idempotent on `postId`, which the client picks, so the offline outbox and
 * a lost response cannot post twice. A private report goes to the topic editors chose for it,
 * whatever topic the client names, and only its author and the Zentrale ever see it.
 */
export const createForumPost = trpcBaseProcedure
  .input(
    z.object({
      topicId: z.uuid(),
      postId: z.uuid(),
      private: z.boolean().default(false),
      title: z.string().trim().min(1).max(FORUM_TITLE_MAX_LENGTH),
      text: z.string().trim().max(FORUM_TEXT_MAX_LENGTH).default(''),
      images: z.array(z.string().max(300)).max(FORUM_POST_MAX_IMAGES).default([]),
      location: z
        .object({
          longitude: z.number().min(-180).max(180),
          latitude: z.number().min(-90).max(90),
          annotationId: z.string().max(64).optional(),
        })
        .optional(),
    }),
  )
  .use(
    rateLimit({
      name: 'forum.createForumPost',
      limit: 5,
      windowMs: 10 * 60 * 1000,
      refuse: () => forumError('TOO_MANY_REQUESTS', 'tooManyPosts'),
    }),
  )
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }): Promise<{ id: string; pending: boolean }> => {
    const { prisma, user } = ctx;
    if (!(await getFeatureFlag(FEATURE_FLAG_FORUM_ENABLED))) {
      throw forumError('FORBIDDEN', 'forumDisabled');
    }

    const topicId = input.private ? await joinPrivateReportTopic(prisma, user.uuid) : input.topicId;
    const chat = await prisma.chat.findUnique({
      where: { uuid: topicId },
      select: {
        uuid: true,
        name: true,
        type: true,
        capabilities: true,
        status: true,
        archivedAt: true,
        chatMemberships: {
          where: { userId: user.uuid },
          select: { userId: true, chatPermission: true },
        },
      },
    });
    const membership = chat?.chatMemberships[0];
    // a topic the caller left, or the outbox replaying for a topic since removed
    if (chat?.type !== ChatType.FORUM || membership === undefined) {
      throw forumError('FORBIDDEN', 'notInTopic');
    }
    await assertWriteAbilities(prisma, chat.uuid, undefined, chat);

    for (const image of input.images) {
      if (!isImageKeyOfChat(image, chat.uuid)) {
        throw invariantError('BAD_REQUEST', 'A forum image must be uploaded to its topic.');
      }
    }

    // two tabs draining the same outbox: the second waits, then finds the first
    await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.postId}, 0))`;
    const existing = await prisma.message.findUnique({
      where: { uuid: input.postId },
      select: { senderId: true, chatId: true },
    });
    if (existing !== null) {
      if (existing.senderId !== user.uuid || existing.chatId !== chat.uuid) {
        throw invariantError('CONFLICT', 'A different message with this ID already exists.');
      }
      const stored = await prisma.forumPost.findUnique({
        where: { messageId: input.postId },
        select: { approvedAt: true },
      });
      return { id: input.postId, pending: stored?.approvedAt === null };
    }

    const message = await prisma.message.create({
      data: {
        uuid: input.postId,
        type: MessageType.TEXT_MSG,
        chatId: chat.uuid,
        senderId: user.uuid,
        contentVersions: { create: [{ payload: { text: input.text, images: input.images } }] },
        messageEvents: {
          create: [
            { type: MessageEventType.CREATED, user: { connect: { uuid: user.uuid } } },
            { type: MessageEventType.STORED },
          ],
        },
      },
    });
    const byTopicAdmin =
      membership.chatPermission === ChatMembershipPermission.OWNER ||
      membership.chatPermission === ChatMembershipPermission.ADMIN;
    // against spam, the admin panel can hold new posts back until a moderator approves them;
    // the Kernteam's own posts need no approval, and a private report reaches only them anyway
    const pending =
      !input.private && !byTopicAdmin && (await getFeatureFlag(FEATURE_FLAG_FORUM_MODERATION));

    await prisma.forumPost.create({
      data: {
        messageId: message.uuid,
        chatId: chat.uuid,
        title: input.title,
        private: input.private,
        approvedAt: pending ? null : new Date(),
        ...(input.location === undefined
          ? {}
          : {
              longitude: input.location.longitude,
              latitude: input.location.latitude,
              annotationId: input.location.annotationId ?? null,
            }),
      },
    });
    await prisma.threadSubscription.create({
      data: { userId: user.uuid, messageId: message.uuid },
    });
    await prisma.chat.update({ where: { uuid: chat.uuid }, data: { lastUpdate: new Date() } });

    ctx.afterTransactionCommit(() => {
      logger.info('Forum post created', {
        'chat.id': chat.uuid,
        'forum.post.id': message.uuid,
        'forum.by_topic_admin': byTopicAdmin,
        'forum.pending': pending,
        'forum.private': input.private,
        'forum.has_location': input.location !== undefined,
      });
      const post = {
        chatId: chat.uuid,
        postId: message.uuid,
        title: input.title,
        text: input.text === '' ? input.title : input.text,
        topicName: chat.name,
        senderId: user.uuid,
        senderName: user.name,
      };
      if (input.private) {
        pushForumModerators({ ...post, text: privateReportText(input.title)[ctx.locale] });
        return;
      }
      if (pending) {
        pushForumModerators({ ...post, text: pendingText(input.title)[ctx.locale] });
        return;
      }
      announceForumPost({
        ...post,
        byTopicAdmin,
        createdAt: message.createdAt,
        images: input.images,
        rawText: input.text,
      });
    });

    return { id: message.uuid, pending };
  });

/**
 * Sets the status of a post: Kernteam, the piket on duty, and a helper for the one post handed
 * to them. Done ends every open assignment. A replay of one's own change answers with the post as
 * it is; a change somebody else made first is a reason, so the helper learns it was done already.
 */
export const updateForumPostStatus = trpcBaseProcedure
  .input(
    z.object({
      postId: z.uuid(),
      status: z.enum(FORUM_POST_STATUSES),
      note: optionalNote,
    }),
  )
  .use(moderationLimit)
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }): Promise<{ status: ForumPostStatusValue }> => {
    const { prisma, user } = ctx;
    await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.postId}, 1))`;
    const post = await loadPost(prisma, input.postId);
    if (post.mergedIntoId !== null) throw forumError('CONFLICT', 'postMerged');

    if (post.status === input.status) {
      if (post.statusChangedById === user.uuid || input.status !== 'DONE') {
        return { status: post.status };
      }
      throw forumError('CONFLICT', 'postAlreadyDone');
    }

    const moderator = await resolveForumModerator(prisma, user.uuid, post.chatId, post.messageId);
    if (moderator === undefined) {
      const hadAssignment = await prisma.forumPostAssignment.count({
        where: { messageId: post.messageId, assigneeId: user.uuid },
      });
      throw forumError('FORBIDDEN', hadAssignment > 0 ? 'assignmentEnded' : 'notAllowed');
    }

    await prisma.forumPost.update({
      where: { messageId: post.messageId },
      data: { status: input.status, statusChangedAt: new Date(), statusChangedById: user.uuid },
    });
    await recordForumAuditEvent(prisma, {
      action: 'STATUS_CHANGED',
      post: { messageId: post.messageId, chatId: post.chatId, title: post.title },
      topicName: post.topicName,
      actor: { id: user.uuid, name: user.name },
      moderator,
      before: { status: post.status },
      after: { status: input.status },
      note: input.note,
    });
    if (input.status === 'DONE') {
      await endAssignments(prisma, { messageId: post.messageId }, user.uuid);
    }

    ctx.afterTransactionCommit(() => {
      logger.info('Forum post status changed', {
        'chat.id': post.chatId,
        'forum.post.id': post.messageId,
        'forum.status': input.status,
        'forum.capacity': moderator.capacity,
      });
      pushForumThread({
        chatId: post.chatId,
        postId: post.messageId,
        postTitle: post.title,
        text: statusPushText(input.status, input.note, ctx.locale),
        actorId: user.uuid,
        senderName: user.name,
        includePiket: false,
      });
    });
    return { status: input.status };
  });

/** Pins a post above the others of its topic, or takes it down again. */
export const setForumPostPinned = trpcBaseProcedure
  .input(z.object({ postId: z.uuid(), pinned: z.boolean() }))
  .use(moderationLimit)
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }): Promise<{ pinned: boolean }> => {
    const { prisma, user } = ctx;
    const post = await loadPost(prisma, input.postId);
    const moderator = await requireModerator(prisma, user.uuid, post, true);
    if ((post.pinnedAt !== null) === input.pinned) return { pinned: input.pinned };

    await prisma.forumPost.update({
      where: { messageId: post.messageId },
      data: { pinnedAt: input.pinned ? new Date() : null },
    });
    await recordForumAuditEvent(prisma, {
      action: input.pinned ? 'PINNED' : 'UNPINNED',
      post: { messageId: post.messageId, chatId: post.chatId, title: post.title },
      topicName: post.topicName,
      actor: { id: user.uuid, name: user.name },
      moderator,
    });
    return { pinned: input.pinned };
  });

/** Marks a comment as the answer of a post, shown above the other comments, or clears it. */
export const setForumPostAnswer = trpcBaseProcedure
  .input(z.object({ postId: z.uuid(), commentId: z.uuid().nullable() }))
  .use(moderationLimit)
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }): Promise<{ answerCommentId: string | null }> => {
    const { prisma, user } = ctx;
    const post = await loadPost(prisma, input.postId);
    const moderator = await requireModerator(prisma, user.uuid, post, true);
    if (post.answerMessageId === input.commentId) return { answerCommentId: input.commentId };

    if (input.commentId !== null) {
      const comment = await prisma.message.findUnique({
        where: { uuid: input.commentId },
        select: { parentId: true, deletedAt: true },
      });
      if (comment?.parentId !== post.messageId || comment.deletedAt !== null) {
        throw forumError('NOT_FOUND', 'notAComment');
      }
    }

    await prisma.forumPost.update({
      where: { messageId: post.messageId },
      data: { answerMessageId: input.commentId },
    });
    await recordForumAuditEvent(prisma, {
      action: input.commentId === null ? 'ANSWER_UNMARKED' : 'ANSWER_MARKED',
      post: { messageId: post.messageId, chatId: post.chatId, title: post.title },
      topicName: post.topicName,
      actor: { id: user.uuid, name: user.name },
      moderator,
      commentId: input.commentId ?? post.answerMessageId ?? undefined,
    });
    return { answerCommentId: input.commentId };
  });

/**
 * Merges a duplicate into the post it repeats: the duplicate leaves the lists, its likes count
 * for the other one, and its subscribers follow the other one from now on.
 */
export const mergeForumPost = trpcBaseProcedure
  .input(z.object({ postId: z.uuid(), intoPostId: z.uuid() }))
  .use(moderationLimit)
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }): Promise<{ mergedIntoId: string }> => {
    const { prisma, user } = ctx;
    const post = await loadPost(prisma, input.postId);
    const into = await loadPost(prisma, input.intoPostId);
    const moderator = await requireModerator(prisma, user.uuid, post, true);
    if (post.mergedIntoId === into.messageId) return { mergedIntoId: into.messageId };
    if (
      post.messageId === into.messageId ||
      post.chatId !== into.chatId ||
      into.mergedIntoId !== null
    ) {
      throw forumError('BAD_REQUEST', 'mergeIntoItself');
    }

    await prisma.forumPost.update({
      where: { messageId: post.messageId },
      data: { mergedIntoId: into.messageId, pinnedAt: null },
    });
    // a duplicate's own duplicates move along, so nothing points at a merged post
    await prisma.forumPost.updateMany({
      where: { mergedIntoId: post.messageId },
      data: { mergedIntoId: into.messageId },
    });
    const subscribers = await prisma.threadSubscription.findMany({
      where: { messageId: post.messageId },
      select: { userId: true },
    });
    await prisma.threadSubscription.createMany({
      data: subscribers.map(({ userId }) => ({ userId, messageId: into.messageId })),
      skipDuplicates: true,
    });
    await recordForumAuditEvent(prisma, {
      action: 'MERGED',
      post: { messageId: post.messageId, chatId: post.chatId, title: post.title },
      topicName: post.topicName,
      actor: { id: user.uuid, name: user.name },
      moderator,
      after: { intoPostId: into.messageId, intoTitle: into.title },
    });

    ctx.afterTransactionCommit(() => {
      pushForumThread({
        chatId: post.chatId,
        postId: post.messageId,
        postTitle: post.title,
        text: mergedText(into.title)[ctx.locale],
        actorId: user.uuid,
        includePiket: false,
      });
    });
    return { mergedIntoId: into.messageId };
  });

/** Undoes a merge: the post is back in the lists with its own likes. */
export const unmergeForumPost = trpcBaseProcedure
  .input(z.object({ postId: z.uuid() }))
  .use(moderationLimit)
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }): Promise<{ mergedIntoId: null }> => {
    const { prisma, user } = ctx;
    const post = await loadPost(prisma, input.postId);
    const moderator = await requireModerator(prisma, user.uuid, post, true);
    if (post.mergedIntoId === null) return { mergedIntoId: null };

    await prisma.forumPost.update({
      where: { messageId: post.messageId },
      data: { mergedIntoId: null },
    });
    await recordForumAuditEvent(prisma, {
      action: 'UNMERGED',
      post: { messageId: post.messageId, chatId: post.chatId, title: post.title },
      topicName: post.topicName,
      actor: { id: user.uuid, name: user.name },
      moderator,
      before: { intoPostId: post.mergedIntoId },
    });
    return { mergedIntoId: null };
  });

/**
 * Deletes a post or a comment someone else wrote, for everyone. Authors delete their own through
 * `chat.deleteMessage`. The protocol keeps the deleted text, so a deletion can be reviewed.
 */
export const deleteForumMessage = trpcBaseProcedure
  .input(z.object({ messageId: z.uuid(), note: optionalNote }))
  .use(moderationLimit)
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }): Promise<{ deletedAt: Date }> => {
    const { prisma, user } = ctx;
    const message = await prisma.message.findUnique({
      where: { uuid: input.messageId },
      select: {
        uuid: true,
        chatId: true,
        type: true,
        parentId: true,
        createdAt: true,
        deletedAt: true,
        senderId: true,
        sender: { select: { name: true } },
        contentVersions: { take: 1, orderBy: { revision: 'desc' }, select: { payload: true } },
      },
    });
    if (message === null) throw forumError('NOT_FOUND', 'postGone');
    if (message.deletedAt !== null) return { deletedAt: message.deletedAt };

    const post = await loadPost(prisma, message.parentId ?? message.uuid);
    if (post.chatId !== message.chatId) {
      throw invariantError('BAD_REQUEST', 'The message is not part of a forum post.');
    }
    const moderator = await requireModerator(prisma, user.uuid, post, true);

    const deletedAt = new Date();
    await prisma.message.update({
      where: { uuid: message.uuid },
      data: { deletedAt, deletedById: user.uuid },
    });
    await prisma.messageReaction.deleteMany({ where: { messageId: message.uuid } });
    if (post.answerMessageId === message.uuid) {
      await prisma.forumPost.update({
        where: { messageId: post.messageId },
        data: { answerMessageId: null },
      });
    }
    const isComment = message.parentId !== null;
    if (!isComment) {
      await endAssignments(prisma, { messageId: post.messageId }, user.uuid);
    }
    await recordForumAuditEvent(prisma, {
      action: 'DELETED',
      post: { messageId: post.messageId, chatId: post.chatId, title: post.title },
      topicName: post.topicName,
      actor: { id: user.uuid, name: user.name },
      moderator,
      ...(isComment ? { commentId: message.uuid } : {}),
      before: {
        text: readForumPostContent(message.contentVersions[0]?.payload).text,
        authorId: message.senderId,
        authorName: message.sender?.name ?? null,
      },
      note: input.note,
    });

    ctx.afterTransactionCommit(() => {
      logger.info('Forum message deleted by a moderator', {
        'chat.id': message.chatId,
        'message.id': message.uuid,
        'forum.capacity': moderator.capacity,
      });
      chatPubSub
        .publish({
          type: 'message_deleted',
          chatId: message.chatId,
          senderId: user.uuid,
          message: {
            id: message.uuid,
            createdAt: message.createdAt,
            messagePayload: {},
            senderId: message.senderId ?? user.uuid,
            status: MessageEventType.STORED,
            type: message.type,
            parentId: message.parentId ?? undefined,
            deletedAt,
          },
        })
        .catch((error: unknown) => {
          logger.error('Failed to publish a deleted forum message', {
            error,
            'chat.id': message.chatId,
            'message.id': message.uuid,
          });
        });
    });
    return { deletedAt };
  });

/**
 * Hands a post to a helper, anyone who has logged in once. While the assignment is open they
 * belong to the topic and may change the status of this one post. An open post goes to "in
 * progress" with it, since someone is on the way.
 */
export const createForumPostAssignment = trpcBaseProcedure
  .input(z.object({ postId: z.uuid(), assigneeId: z.string().min(1).max(64), note: optionalNote }))
  .use(moderationLimit)
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }): Promise<{ id: string }> => {
    const { prisma, user } = ctx;
    const post = await loadPost(prisma, input.postId);
    if (post.mergedIntoId !== null) throw forumError('CONFLICT', 'postMerged');
    if (post.status === 'DONE') throw forumError('CONFLICT', 'postAlreadyDone');
    const moderator = await requireModerator(prisma, user.uuid, post, true);

    const assignee = await prisma.user.findUnique({
      where: { uuid: input.assigneeId },
      select: { uuid: true, name: true },
    });
    if (assignee === null) throw forumError('NOT_FOUND', 'assigneeUnknown');

    const open = await prisma.forumPostAssignment.findFirst({
      where: { messageId: post.messageId, assigneeId: assignee.uuid, endedAt: null },
      select: { id: true },
    });
    if (open !== null) return { id: open.id };

    const membership = await prisma.chatMembership.findUnique({
      where: { userId_chatId: { userId: assignee.uuid, chatId: post.chatId } },
      select: { userId: true },
    });
    if (membership === null) {
      await prisma.chatMembership.create({
        data: {
          userId: assignee.uuid,
          chatId: post.chatId,
          chatPermission: ChatMembershipPermission.MEMBER,
        },
      });
    }
    const assignment = await prisma.forumPostAssignment.create({
      data: {
        messageId: post.messageId,
        assigneeId: assignee.uuid,
        assignedById: user.uuid,
        note: input.note ?? null,
        addedMembership: membership === null,
      },
      select: { id: true },
    });
    await prisma.threadSubscription.createMany({
      data: [
        { userId: assignee.uuid, messageId: post.messageId },
        { userId: user.uuid, messageId: post.messageId },
      ],
      skipDuplicates: true,
    });
    await recordForumAuditEvent(prisma, {
      action: 'ASSIGNED',
      post: { messageId: post.messageId, chatId: post.chatId, title: post.title },
      topicName: post.topicName,
      actor: { id: user.uuid, name: user.name },
      moderator,
      after: {
        assignmentId: assignment.id,
        assigneeId: assignee.uuid,
        assigneeName: assignee.name,
      },
      note: input.note,
    });
    if (post.status === 'OPEN') {
      await prisma.forumPost.update({
        where: { messageId: post.messageId },
        data: { status: 'IN_PROGRESS', statusChangedAt: new Date(), statusChangedById: user.uuid },
      });
      await recordForumAuditEvent(prisma, {
        action: 'STATUS_CHANGED',
        post: { messageId: post.messageId, chatId: post.chatId, title: post.title },
        topicName: post.topicName,
        actor: { id: user.uuid, name: user.name },
        moderator,
        before: { status: post.status },
        after: { status: 'IN_PROGRESS' },
      });
    }

    ctx.afterTransactionCommit(() => {
      logger.info('Forum post assigned', {
        'chat.id': post.chatId,
        'forum.post.id': post.messageId,
        'forum.capacity': moderator.capacity,
      });
      const capacity = forumCapacityLabel[moderator.capacity][ctx.locale];
      const headline = assignedText(user.name, capacity)[ctx.locale];
      pushForumPerson({
        chatId: post.chatId,
        postId: post.messageId,
        postTitle: post.title,
        text: input.note === undefined ? headline : `${headline}: ${input.note}`,
        recipientId: assignee.uuid,
      });
    });
    return { id: assignment.id };
  });

/** Withdraws an assignment, so nobody goes out to fix what was fixed already. */
export const endForumPostAssignment = trpcBaseProcedure
  .input(z.object({ assignmentId: z.uuid() }))
  .use(moderationLimit)
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }): Promise<{ ended: boolean }> => {
    const { prisma, user } = ctx;
    const assignment = await prisma.forumPostAssignment.findUnique({
      where: { id: input.assignmentId },
      select: {
        messageId: true,
        endedAt: true,
        assigneeId: true,
        assignee: { select: { name: true } },
      },
    });
    if (assignment === null) throw forumError('NOT_FOUND', 'postGone');
    if (assignment.endedAt !== null) return { ended: true };

    const post = await loadPost(prisma, assignment.messageId);
    const moderator = await requireModerator(prisma, user.uuid, post, true);
    await endAssignments(prisma, { messageId: post.messageId, id: input.assignmentId }, user.uuid);
    await recordForumAuditEvent(prisma, {
      action: 'ASSIGNMENT_ENDED',
      post: { messageId: post.messageId, chatId: post.chatId, title: post.title },
      topicName: post.topicName,
      actor: { id: user.uuid, name: user.name },
      moderator,
      before: {
        assignmentId: input.assignmentId,
        assigneeId: assignment.assigneeId,
        assigneeName: assignment.assignee.name,
      },
    });

    ctx.afterTransactionCommit(() => {
      pushForumPerson({
        chatId: post.chatId,
        postId: post.messageId,
        postTitle: post.title,
        text: assignmentEndedText(user.name)[ctx.locale],
        recipientId: assignment.assigneeId,
      });
    });
    return { ended: true };
  });

/** Subscribes to every new post of a topic, or stops. Comments follow the post's subscription. */
export const updateForumTopicSubscription = trpcBaseProcedure
  .input(z.object({ topicId: z.uuid(), subscribed: z.boolean() }))
  .mutation(async ({ ctx, input }): Promise<{ subscribed: boolean }> => {
    const { count } = await ctx.prisma.chatMembership.updateMany({
      where: { userId: ctx.user.uuid, chatId: input.topicId, chat: { type: ChatType.FORUM } },
      data: { subscribedAt: input.subscribed ? new Date() : null },
    });
    if (count === 0) throw forumError('FORBIDDEN', 'notInTopic');
    return { subscribed: input.subscribed };
  });

/** Subscribes to the comments and status changes of one post, or stops. */
export const updateForumPostSubscription = trpcBaseProcedure
  .input(z.object({ postId: z.uuid(), subscribed: z.boolean() }))
  .mutation(async ({ ctx, input }): Promise<{ subscribed: boolean }> => {
    const { prisma, user } = ctx;
    const post = await prisma.forumPost.findFirst({
      where: {
        messageId: input.postId,
        chat: { chatMemberships: { some: { userId: user.uuid } } },
      },
      select: { messageId: true },
    });
    if (post === null) throw forumError('NOT_FOUND', 'postGone');
    await (input.subscribed
      ? prisma.threadSubscription.upsert({
          where: { userId_messageId: { userId: user.uuid, messageId: post.messageId } },
          create: { userId: user.uuid, messageId: post.messageId },
          update: {},
        })
      : prisma.threadSubscription.deleteMany({
          where: { userId: user.uuid, messageId: post.messageId },
        }));
    return { subscribed: input.subscribed };
  });

/**
 * Approves a post that waited for it, while the admin panel holds new posts back: it becomes
 * public, and only now do its pushes go out. Rejecting is deleting it, `deleteForumMessage`.
 */
export const approveForumPost = trpcBaseProcedure
  .input(z.object({ postId: z.uuid() }))
  .use(moderationLimit)
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }): Promise<{ approved: boolean }> => {
    const { prisma, user } = ctx;
    const post = await loadPost(prisma, input.postId);
    const moderator = await requireModerator(prisma, user.uuid, post, true);
    const row = await prisma.forumPost.findUniqueOrThrow({
      where: { messageId: post.messageId },
      select: {
        approvedAt: true,
        message: {
          select: {
            createdAt: true,
            sender: { select: { name: true } },
            contentVersions: { take: 1, orderBy: { revision: 'desc' }, select: { payload: true } },
          },
        },
      },
    });
    // a second moderator, or a double tap: nothing more to do
    if (row.approvedAt !== null) return { approved: true };

    await prisma.forumPost.update({
      where: { messageId: post.messageId },
      data: { approvedAt: new Date(), approvedById: user.uuid },
    });
    await recordForumAuditEvent(prisma, {
      action: 'APPROVED',
      post: { messageId: post.messageId, chatId: post.chatId, title: post.title },
      topicName: post.topicName,
      actor: { id: user.uuid, name: user.name },
      moderator,
    });

    const content = readForumPostContent(row.message.contentVersions[0]?.payload);
    ctx.afterTransactionCommit(() => {
      logger.info('Forum post approved', {
        'chat.id': post.chatId,
        'forum.post.id': post.messageId,
        'forum.capacity': moderator.capacity,
      });
      if (post.senderId === null) return;
      announceForumPost({
        chatId: post.chatId,
        postId: post.messageId,
        title: post.title,
        text: content.text === '' ? post.title : content.text,
        rawText: content.text,
        images: content.images,
        topicName: post.topicName,
        senderId: post.senderId,
        senderName: row.message.sender?.name ?? '',
        byTopicAdmin: false,
        createdAt: row.message.createdAt,
      });
    });
    return { approved: true };
  });
