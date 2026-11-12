import { forumError } from '@/features/chat/api/forum/forum-errors';
import { recordForumFlag, recordForumRemoval } from '@/features/chat/api/forum/forum-metrics';
import {
  AUTOMATIC_MODERATOR,
  type ForumModerator,
  recordForumAuditEvent,
} from '@/features/chat/api/forum/forum-moderator';
import {
  endAssignments,
  type LoadedPost,
  loadPost,
  moderationLimit,
  optionalNote,
  requireModerator,
} from '@/features/chat/api/forum/forum-mutations';
import { readForumPostContent } from '@/features/chat/api/forum/forum-posts';
import {
  pushForumModerators,
  pushForumPerson,
  pushForumThread,
} from '@/features/chat/api/forum/forum-push';
import {
  canSeeForumPost,
  findForumPostVisibility,
  publishForumThreadEvent,
} from '@/features/chat/api/forum/forum-visibility';
import { chatPubSub } from '@/lib/db/chat-pubsub';
import poolPrisma from '@/lib/db/prisma';
import {
  FORUM_FLAG_REASONS,
  FORUM_FLAGS_TO_HIDE,
  FORUM_POST_KINDS,
  FORUM_TEXT_MAX_LENGTH,
  FORUM_TITLE_MAX_LENGTH,
  type ForumFlagReasonValue,
  forumFlagReasonLabel,
  forumKindLabel,
  type ForumPostKindValue,
  MESSAGE_EDIT_WINDOW_MS,
} from '@/lib/forum-shared';
import type { Prisma } from '@/lib/prisma/client';
import { ChatType, MessageEventType } from '@/lib/prisma/enums';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { rateLimit } from '@/trpc/middleware/rate-limit';
import type { Locale, PrismaClientOrTransaction, StaticTranslationString } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import { z } from 'zod';

const logger = createLogger('forum:moderation');

/**
 * Flags, hiding, deleting and restoring, the kind of a post and its author's edits. Everything
 * here that someone does to a message they did not write is in the protocol, and its author
 * hears why.
 */

const removedText = (
  kind: 'HIDDEN' | 'DELETED',
  reason: ForumFlagReasonValue,
  note: string | undefined,
  locale: Locale,
): string => {
  const what: StaticTranslationString =
    kind === 'HIDDEN'
      ? {
          de: 'Ausgeblendet, bis du ihn überarbeitest',
          en: 'Hidden until you revise it',
          fr: 'Masqué jusqu’à ce que tu le modifies',
        }
      : {
          de: 'Von der Moderation entfernt',
          en: 'Removed by the moderators',
          fr: 'Retiré par la modération',
        };
  const reasonLabel = forumFlagReasonLabel[reason][locale];
  return note === undefined
    ? `${what[locale]}: ${reasonLabel}`
    : `${what[locale]}: ${reasonLabel}. ${note}`;
};

const restoredText: StaticTranslationString = {
  de: 'Wieder für alle sichtbar.',
  en: 'Visible to everyone again.',
  fr: 'De nouveau visible pour tout le monde.',
};

const flaggedText = (title: string): StaticTranslationString => ({
  de: `Gemeldet: ${title}`,
  en: `Flagged: ${title}`,
  fr: `Signalé : ${title}`,
});

const reviewText = (title: string): StaticTranslationString => ({
  de: `Überarbeitet, bitte prüfen: ${title}`,
  en: `Revised, please review: ${title}`,
  fr: `Modifié, merci de vérifier : ${title}`,
});

/** A post or one of its comments, with the post it belongs to. */
interface LoadedMessage {
  uuid: string;
  chatId: string;
  type: string;
  parentId: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  senderId: string | null;
  authorName: string | null;
  text: string;
  post: LoadedPost;
  isComment: boolean;
}

const loadMessage = async (
  prisma: PrismaClientOrTransaction,
  messageId: string,
): Promise<LoadedMessage> => {
  const message = await prisma.message.findUnique({
    where: { uuid: messageId },
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
  // a stale page or the outbox replaying for a message since deleted
  if (message === null) throw forumError('NOT_FOUND', 'postGone');
  const post = await loadPost(prisma, message.parentId ?? message.uuid);
  if (post.chatId !== message.chatId) throw forumError('NOT_FOUND', 'postGone');
  return {
    uuid: message.uuid,
    chatId: message.chatId,
    type: message.type,
    parentId: message.parentId,
    createdAt: message.createdAt,
    deletedAt: message.deletedAt,
    senderId: message.senderId,
    authorName: message.sender?.name ?? null,
    text: readForumPostContent(message.contentVersions[0]?.payload).text,
    post,
    isComment: message.parentId !== null,
  };
};

/** Tells open pages that a message changed, on the channel that may know about it. */
const announceChange = async (
  prisma: PrismaClientOrTransaction,
  message: LoadedMessage,
  actorId: string,
): Promise<void> => {
  const visibility = await findForumPostVisibility(prisma, message.post.messageId);
  if (visibility === undefined) return;
  await publishForumThreadEvent(prisma, visibility, {
    type: 'message_updated',
    chatId: message.chatId,
    senderId: actorId,
    message: {
      id: message.uuid,
      createdAt: message.createdAt,
      messagePayload: {},
      senderId: message.senderId ?? undefined,
      status: MessageEventType.STORED,
      type: message.type,
      parentId: message.parentId ?? undefined,
    },
  });
};

/**
 * Hides or deletes `message` in one transaction with its protocol entry, and resolves its flags.
 * Shared by moderators and by the flags that hide on their own.
 */
const removeMessage = async (
  prisma: PrismaClientOrTransaction,
  message: LoadedMessage,
  details: {
    kind: 'HIDDEN' | 'DELETED';
    reason: ForumFlagReasonValue;
    note: string | undefined;
    actor: { id: string; name: string };
    moderator: ForumModerator;
  },
): Promise<void> => {
  const automatic = details.moderator.capacity === 'AUTOMATIC';
  const removal = {
    kind: details.kind,
    reason: details.reason,
    note: details.note ?? null,
    removedById: automatic ? null : details.actor.id,
    removedByName: automatic ? null : details.actor.name,
    capacity: details.moderator.capacity,
    createdAt: new Date(),
    reviewRequestedAt: null,
  };
  await prisma.forumRemoval.upsert({
    where: { messageId: message.uuid },
    create: { messageId: message.uuid, ...removal },
    update: removal,
  });
  await prisma.forumFlag.updateMany({
    where: { messageId: message.uuid, resolvedAt: null },
    data: { resolvedAt: new Date() },
  });
  if (details.kind === 'DELETED') {
    await prisma.message.update({
      where: { uuid: message.uuid },
      data: { deletedAt: new Date(), deletedById: details.actor.id },
    });
    await prisma.messageReaction.deleteMany({ where: { messageId: message.uuid } });
    if (message.post.answerMessageId === message.uuid) {
      await prisma.forumPost.update({
        where: { messageId: message.post.messageId },
        data: { answerMessageId: null },
      });
    }
    if (!message.isComment) {
      await endAssignments(prisma, { messageId: message.post.messageId }, details.actor.id);
    }
  }
  await recordForumAuditEvent(prisma, {
    action: details.kind === 'HIDDEN' ? 'HIDDEN' : 'DELETED',
    post: {
      messageId: message.post.messageId,
      chatId: message.post.chatId,
      title: message.post.title,
    },
    topicName: message.post.topicName,
    actor: details.actor,
    moderator: details.moderator,
    ...(message.isComment ? { commentId: message.uuid } : {}),
    // the protocol keeps what was removed, so a removal can be reviewed
    before: { text: message.text, authorId: message.senderId, authorName: message.authorName },
    after: { reason: details.reason },
    note: details.note,
  });
};

/** What happens after a removal commits: the author's push, open pages, the logs. */
const afterRemoval = (
  prisma: PrismaClientOrTransaction,
  message: LoadedMessage,
  details: {
    kind: 'HIDDEN' | 'DELETED';
    reason: ForumFlagReasonValue;
    note: string | undefined;
    actorId: string;
    capacity: string;
    locale: Locale;
  },
): void => {
  logger.info('Forum message removed', {
    'chat.id': message.chatId,
    'message.id': message.uuid,
    'forum.removal.kind': details.kind,
    'forum.removal.reason': details.reason,
    'forum.capacity': details.capacity,
    'forum.comment': message.isComment,
  });
  recordForumRemoval(details.kind, details.capacity === 'AUTOMATIC');
  if (message.senderId !== null && message.senderId !== details.actorId) {
    pushForumPerson({
      chatId: message.chatId,
      postId: message.post.messageId,
      postTitle: message.post.title,
      text: removedText(details.kind, details.reason, details.note, details.locale),
      recipientId: message.senderId,
    });
  }
  const event =
    details.kind === 'DELETED'
      ? chatPubSub.publish({
          type: 'message_deleted',
          chatId: message.chatId,
          senderId: details.actorId,
          message: {
            id: message.uuid,
            createdAt: message.createdAt,
            messagePayload: {},
            senderId: message.senderId ?? details.actorId,
            status: MessageEventType.STORED,
            type: message.type,
            parentId: message.parentId ?? undefined,
            deletedAt: new Date(),
          },
        })
      : announceChange(prisma, message, details.actorId);
  event.catch((error: unknown) => {
    logger.error('Failed to publish a forum removal', {
      error,
      'chat.id': message.chatId,
      'message.id': message.uuid,
    });
  });
};

/**
 * "Melden": a participant flags a post or a comment for its moderators, with a reason. Once
 * `FORUM_FLAGS_TO_HIDE` people flagged it, it is hidden until a moderator decides. Not in a
 * private conversation, whose only readers are its writer and its moderators.
 */
export const createForumFlag = trpcBaseProcedure
  .input(
    z.object({
      messageId: z.uuid(),
      reason: z.enum(FORUM_FLAG_REASONS),
      note: optionalNote,
    }),
  )
  .use(
    rateLimit({
      name: 'forum.createForumFlag',
      limit: 20,
      windowMs: 10 * 60 * 1000,
      refuse: () => forumError('TOO_MANY_REQUESTS', 'tooManyChanges'),
    }),
  )
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }): Promise<{ hidden: boolean }> => {
    const { prisma, user } = ctx;
    const message = await loadMessage(prisma, input.messageId);
    if (message.deletedAt !== null) throw forumError('NOT_FOUND', 'postGone');
    if (message.post.isConversation) throw forumError('CONFLICT', 'notInConversation');
    if (message.senderId === user.uuid) throw forumError('BAD_REQUEST', 'ownMessage');
    const visibility = await findForumPostVisibility(prisma, message.post.messageId);
    const member = await prisma.chatMembership.count({
      where: { chatId: message.chatId, userId: user.uuid },
    });
    if (
      visibility === undefined ||
      member === 0 ||
      !(await canSeeForumPost(prisma, user, visibility))
    ) {
      throw forumError('NOT_FOUND', 'postGone');
    }

    const existing = await prisma.forumFlag.findUnique({
      where: { messageId_userId: { messageId: message.uuid, userId: user.uuid } },
      select: { resolvedAt: true },
    });
    // a replay of the same flag answers with what it did; a second flag after a moderator
    // decided is a new one
    if (existing !== null && existing.resolvedAt === null) {
      throw forumError('CONFLICT', 'alreadyFlagged');
    }
    await prisma.forumFlag.upsert({
      where: { messageId_userId: { messageId: message.uuid, userId: user.uuid } },
      create: {
        messageId: message.uuid,
        userId: user.uuid,
        reason: input.reason,
        note: input.note ?? null,
      },
      update: { reason: input.reason, note: input.note ?? null, resolvedAt: null, createdAt: new Date() },
    });

    const open = await prisma.forumFlag.findMany({
      where: { messageId: message.uuid, resolvedAt: null },
      select: { reason: true },
    });
    const alreadyRemoved = await prisma.forumRemoval.count({ where: { messageId: message.uuid } });
    const hide = open.length >= FORUM_FLAGS_TO_HIDE && alreadyRemoved === 0;
    const reason = mostCommonReason(open.map((flag) => flag.reason));
    if (hide) {
      await removeMessage(prisma, message, {
        kind: 'HIDDEN',
        reason,
        note: undefined,
        actor: { id: 'forum', name: 'Forum' },
        moderator: AUTOMATIC_MODERATOR,
      });
    }

    ctx.afterTransactionCommit(() => {
      recordForumFlag(input.reason);
      logger.info('Forum message flagged', {
        'chat.id': message.chatId,
        'message.id': message.uuid,
        'forum.flag.reason': input.reason,
        'forum.flag.open': open.length,
        'forum.comment': message.isComment,
      });
      pushForumModerators({
        chatId: message.chatId,
        postId: message.post.messageId,
        title: message.post.title,
        text: flaggedText(message.post.title)[ctx.locale],
        topicName: message.post.topicName,
        senderId: user.uuid,
        senderName: '',
      });
      if (hide) {
        afterRemoval(poolPrisma, message, {
          kind: 'HIDDEN',
          reason,
          note: undefined,
          actorId: 'forum',
          capacity: 'AUTOMATIC',
          locale: ctx.locale,
        });
      }
    });
    return { hidden: hide };
  });

const mostCommonReason = (reasons: ForumFlagReasonValue[]): ForumFlagReasonValue => {
  const counts = new Map<ForumFlagReasonValue, number>();
  for (const reason of reasons) counts.set(reason, (counts.get(reason) ?? 0) + 1);
  return [...counts].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? 'OTHER';
};

/**
 * Hides or deletes a post or a comment someone else wrote, with a reason its author reads.
 * Hidden, only its author and the moderators see it, and the author may revise it and ask for
 * it back; deleted, it is gone for everyone. Both leave a placeholder in its place, and the
 * protocol keeps the text.
 */
export const removeForumMessage = trpcBaseProcedure
  .input(
    z.object({
      messageId: z.uuid(),
      kind: z.enum(['HIDDEN', 'DELETED']),
      reason: z.enum(FORUM_FLAG_REASONS),
      note: optionalNote,
    }),
  )
  .use(moderationLimit)
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }): Promise<{ removed: true }> => {
    const { prisma, user } = ctx;
    const message = await loadMessage(prisma, input.messageId);
    const moderator = await requireModerator(prisma, user, message.post, true);
    if (message.deletedAt !== null) return { removed: true };
    const current = await prisma.forumRemoval.findUnique({
      where: { messageId: message.uuid },
      select: { kind: true },
    });
    // a replay of the same hide
    if (current?.kind === input.kind) return { removed: true };

    await removeMessage(prisma, message, {
      kind: input.kind,
      reason: input.reason,
      note: input.note,
      actor: { id: user.uuid, name: user.name },
      moderator,
    });
    ctx.afterTransactionCommit(() => {
      afterRemoval(poolPrisma, message, {
        kind: input.kind,
        reason: input.reason,
        note: input.note,
        actorId: user.uuid,
        capacity: moderator.capacity,
        locale: ctx.locale,
      });
    });
    return { removed: true };
  });

/**
 * Deletes a post or a comment someone else wrote, for the moderation sheet of the release
 * before reasons, which its persisted pages still call.
 */
export const deleteForumMessage = trpcBaseProcedure
  .input(z.object({ messageId: z.uuid(), note: optionalNote }))
  .use(moderationLimit)
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }): Promise<{ deletedAt: Date }> => {
    const { prisma, user } = ctx;
    const message = await loadMessage(prisma, input.messageId);
    const moderator = await requireModerator(prisma, user, message.post, true);
    if (message.deletedAt !== null) return { deletedAt: message.deletedAt };
    await removeMessage(prisma, message, {
      kind: 'DELETED',
      reason: 'OTHER',
      note: input.note,
      actor: { id: user.uuid, name: user.name },
      moderator,
    });
    ctx.afterTransactionCommit(() => {
      afterRemoval(poolPrisma, message, {
        kind: 'DELETED',
        reason: 'OTHER',
        note: input.note,
        actorId: user.uuid,
        capacity: moderator.capacity,
        locale: ctx.locale,
      });
    });
    return { deletedAt: new Date() };
  });

/** Shows a hidden post or comment again, and resolves what flags were left. */
export const restoreForumMessage = trpcBaseProcedure
  .input(z.object({ messageId: z.uuid() }))
  .use(moderationLimit)
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }): Promise<{ restored: true }> => {
    const { prisma, user } = ctx;
    const message = await loadMessage(prisma, input.messageId);
    const moderator = await requireModerator(prisma, user, message.post, true);
    const removal = await prisma.forumRemoval.findUnique({
      where: { messageId: message.uuid },
      select: { kind: true },
    });
    if (removal === null) return { restored: true };
    if (removal.kind !== 'HIDDEN') throw forumError('CONFLICT', 'notHidden');

    await prisma.forumRemoval.delete({ where: { messageId: message.uuid } });
    await prisma.forumFlag.updateMany({
      where: { messageId: message.uuid, resolvedAt: null },
      data: { resolvedAt: new Date() },
    });
    await recordForumAuditEvent(prisma, {
      action: 'RESTORED',
      post: {
        messageId: message.post.messageId,
        chatId: message.post.chatId,
        title: message.post.title,
      },
      topicName: message.post.topicName,
      actor: { id: user.uuid, name: user.name },
      moderator,
      ...(message.isComment ? { commentId: message.uuid } : {}),
    });
    ctx.afterTransactionCommit(() => {
      logger.info('Forum message restored', {
        'chat.id': message.chatId,
        'message.id': message.uuid,
        'forum.capacity': moderator.capacity,
      });
      if (message.senderId !== null && message.senderId !== user.uuid) {
        pushForumPerson({
          chatId: message.chatId,
          postId: message.post.messageId,
          postTitle: message.post.title,
          text: restoredText[ctx.locale],
          recipientId: message.senderId,
        });
      }
      announceChange(poolPrisma, message, user.uuid).catch((error: unknown) => {
        logger.error('Failed to publish a restored forum message', {
          error,
          'message.id': message.uuid,
        });
      });
    });
    return { restored: true };
  });

/** Finds the open flags of a post or a comment unfounded: it stays as it is. */
export const dismissForumFlags = trpcBaseProcedure
  .input(z.object({ messageId: z.uuid() }))
  .use(moderationLimit)
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }): Promise<{ dismissed: number }> => {
    const { prisma, user } = ctx;
    const message = await loadMessage(prisma, input.messageId);
    const moderator = await requireModerator(prisma, user, message.post, true);
    const { count } = await prisma.forumFlag.updateMany({
      where: { messageId: message.uuid, resolvedAt: null },
      data: { resolvedAt: new Date() },
    });
    if (count === 0) return { dismissed: 0 };
    await recordForumAuditEvent(prisma, {
      action: 'FLAGS_DISMISSED',
      post: {
        messageId: message.post.messageId,
        chatId: message.post.chatId,
        title: message.post.title,
      },
      topicName: message.post.topicName,
      actor: { id: user.uuid, name: user.name },
      moderator,
      ...(message.isComment ? { commentId: message.uuid } : {}),
      after: { count },
    });
    return { dismissed: count };
  });

/**
 * The author of a hidden post or comment revised it and asks for it to be shown again. The
 * moderators find it in "Zu tun".
 */
export const requestForumReview = trpcBaseProcedure
  .input(z.object({ messageId: z.uuid() }))
  .use(moderationLimit)
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }): Promise<{ requested: true }> => {
    const { prisma, user } = ctx;
    const message = await loadMessage(prisma, input.messageId);
    if (message.senderId !== user.uuid) throw forumError('FORBIDDEN', 'notAllowed');
    const { count } = await prisma.forumRemoval.updateMany({
      where: { messageId: message.uuid, kind: 'HIDDEN', reviewRequestedAt: null },
      data: { reviewRequestedAt: new Date() },
    });
    if (count === 0) {
      const removal = await prisma.forumRemoval.count({
        where: { messageId: message.uuid, kind: 'HIDDEN' },
      });
      if (removal === 0) throw forumError('CONFLICT', 'notHidden');
      return { requested: true };
    }
    ctx.afterTransactionCommit(() => {
      pushForumModerators({
        chatId: message.chatId,
        postId: message.post.messageId,
        title: message.post.title,
        text: reviewText(message.post.title)[ctx.locale],
        topicName: message.post.topicName,
        senderId: user.uuid,
        senderName: user.name,
      });
    });
    return { requested: true };
  });

/** Files a post as a question, a problem or an idea, when its author chose the wrong one. */
export const setForumPostKind = trpcBaseProcedure
  .input(z.object({ postId: z.uuid(), kind: z.enum(FORUM_POST_KINDS) }))
  .use(moderationLimit)
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }): Promise<{ kind: ForumPostKindValue }> => {
    const { prisma, user } = ctx;
    const post = await loadPost(prisma, input.postId);
    const moderator = await requireModerator(prisma, user, post, true);
    if (post.isConversation) throw forumError('CONFLICT', 'notInConversation');
    const stored = await prisma.forumPost.findUniqueOrThrow({
      where: { messageId: post.messageId },
      select: { kind: true },
    });
    if (stored.kind === input.kind) return { kind: input.kind };

    await prisma.forumPost.update({
      where: { messageId: post.messageId },
      data: { kind: input.kind },
    });
    await recordForumAuditEvent(prisma, {
      action: 'KIND_CHANGED',
      post: { messageId: post.messageId, chatId: post.chatId, title: post.title },
      topicName: post.topicName,
      actor: { id: user.uuid, name: user.name },
      moderator,
      before: { kind: stored.kind },
      after: { kind: input.kind },
    });
    ctx.afterTransactionCommit(() => {
      pushForumThread({
        chatId: post.chatId,
        postId: post.messageId,
        postTitle: post.title,
        text: kindChangedNotice(input.kind, ctx.locale),
        actorId: user.uuid,
        senderName: user.name,
        includePiket: false,
      });
    });
    return { kind: input.kind };
  });

const kindChangedNotice = (kind: ForumPostKindValue, locale: Locale): string => {
  const label = forumKindLabel[kind][locale];
  const text: StaticTranslationString = {
    de: `Jetzt als ${label} eingeordnet.`,
    en: `Now filed as ${label}.`,
    fr: `Classé maintenant comme ${label}.`,
  };
  return text[locale];
};

/**
 * Its author changes the title and the text of a post: within a day of writing it, or while a
 * moderator keeps it hidden, to fix what they were asked to. The photos stay. The older
 * versions stay for the moderators.
 */
export const updateForumPost = trpcBaseProcedure
  .input(
    z.object({
      postId: z.uuid(),
      title: z.string().trim().min(1).max(FORUM_TITLE_MAX_LENGTH),
      text: z.string().trim().max(FORUM_TEXT_MAX_LENGTH).default(''),
    }),
  )
  .use(moderationLimit)
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }): Promise<{ editedAt: Date }> => {
    const { prisma, user } = ctx;
    const post = await loadPost(prisma, input.postId);
    if (post.senderId !== user.uuid) throw forumError('FORBIDDEN', 'notAllowed');
    const row = await prisma.message.findUniqueOrThrow({
      where: { uuid: post.messageId },
      select: {
        createdAt: true,
        type: true,
        forumRemoval: { select: { kind: true } },
        chat: { select: { status: true, type: true } },
        contentVersions: {
          take: 1,
          orderBy: { revision: 'desc' },
          select: { revision: true, payload: true },
        },
      },
    });
    const hidden = row.forumRemoval?.kind === 'HIDDEN';
    if (!hidden && Date.now() - row.createdAt.getTime() > MESSAGE_EDIT_WINDOW_MS) {
      throw forumError('FORBIDDEN', 'editWindowOver');
    }
    if (row.chat.type === ChatType.FORUM_CONVERSATION && row.chat.status === 'CLOSED') {
      throw forumError('CONFLICT', 'conversationClosed');
    }
    const latest = row.contentVersions[0];
    const previous = (latest?.payload ?? {}) as Record<string, unknown>;
    const editedAt = new Date();
    await prisma.messageContent.create({
      data: {
        messageId: post.messageId,
        revision: (latest?.revision ?? 0) + 1,
        payload: { ...previous, text: input.text } as Prisma.InputJsonValue,
      },
    });
    await prisma.message.update({ where: { uuid: post.messageId }, data: { editedAt } });
    await prisma.forumPost.update({
      where: { messageId: post.messageId },
      data: { title: input.title, body: input.text },
    });
    if (row.chat.type === ChatType.FORUM_CONVERSATION) {
      await prisma.chat.update({ where: { uuid: post.chatId }, data: { name: input.title } });
    }
    ctx.afterTransactionCommit(() => {
      logger.info('Forum post edited by its author', {
        'chat.id': post.chatId,
        'forum.post.id': post.messageId,
        'forum.hidden': hidden,
      });
      const visibility = findForumPostVisibility(poolPrisma, post.messageId);
      visibility
        .then((found) =>
          found === undefined
            ? undefined
            : publishForumThreadEvent(poolPrisma, found, {
                type: 'message_updated',
                chatId: post.chatId,
                senderId: user.uuid,
                message: {
                  id: post.messageId,
                  createdAt: row.createdAt,
                  messagePayload: {},
                  senderId: user.uuid,
                  status: MessageEventType.STORED,
                  type: row.type,
                },
              }),
        )
        .catch((error: unknown) => {
          logger.error('Failed to publish an edited forum post', {
            error,
            'forum.post.id': post.messageId,
          });
        });
    });
    return { editedAt };
  });
