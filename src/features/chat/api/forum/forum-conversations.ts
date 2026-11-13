import { forumError } from '@/features/chat/api/forum/forum-errors';
import { type ForumUser, isForumZentrale } from '@/features/chat/api/forum/forum-moderator';
import { findForumTopicSettings } from '@/features/chat/api/forum/forum-topic-settings';
import { getActivePiketMembers } from '@/features/chat/api/utils/piket-service';
import type { ForumPostStatusValue } from '@/lib/forum-shared';
import {
  ChatCapability,
  ChatMembershipPermission,
  ChatType,
  MessageEventType,
} from '@/lib/prisma/enums';
import { readFeatureFlag } from '@/lib/read-feature-flags';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { rateLimit } from '@/trpc/middleware/rate-limit';
import type { PrismaClientOrTransaction } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import { z } from 'zod';

const logger = createLogger('forum:conversations');

/**
 * A private conversation with the Kernteam of a topic is a chat of its own, of type
 * `FORUM_CONVERSATION`, holding one post whose thread are the answers. Who reads it is who is a
 * member: the writer, the topic's Kernteam as ADMINs, the piket on duty, added by its sync, and
 * whoever at the Zentrale opens it, added then. So nothing about it has to be filtered out of a
 * shared chat, unlike a hidden post of a topic. It closes when it is set to done.
 */

/** A conversation can do what a topic can: photos, a thread of answers, likes. */
export const FORUM_CONVERSATION_CAPABILITIES: ChatCapability[] = [
  ChatCapability.CAN_SEND_MESSAGES,
  ChatCapability.PICTURE_UPLOAD,
  ChatCapability.THREADS,
  ChatCapability.THREAD_REPLIES,
  ChatCapability.EMOJI_REACTIONS,
];

const isTopicAdmin = (permission: ChatMembershipPermission): boolean =>
  permission === ChatMembershipPermission.OWNER || permission === ChatMembershipPermission.ADMIN;

/**
 * Opens a conversation with the Kernteam of `topicId`, empty until its post is written with
 * `forum.createForumPost`, so the composer can upload its photos into it first. Idempotent on
 * `conversationId`, which the client picks and which becomes the chat's id.
 */
export const openForumConversation = trpcBaseProcedure
  .input(z.object({ topicId: z.uuid(), conversationId: z.uuid() }))
  .use(
    rateLimit({
      name: 'forum.openForumConversation',
      limit: 5,
      windowMs: 10 * 60 * 1000,
      refuse: () => forumError('TOO_MANY_REQUESTS', 'tooManyPosts'),
    }),
  )
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }): Promise<{ chatId: string }> => {
    const { prisma, user } = ctx;
    if (!(await readFeatureFlag('forumEnabled'))) throw forumError('FORBIDDEN', 'forumDisabled');

    const existing = await prisma.chat.findUnique({
      where: { uuid: input.conversationId },
      select: {
        type: true,
        forumTopicId: true,
        chatMemberships: { where: { userId: user.uuid }, select: { userId: true } },
      },
    });
    if (existing !== null) {
      if (
        existing.type !== ChatType.FORUM_CONVERSATION ||
        existing.forumTopicId !== input.topicId ||
        existing.chatMemberships.length === 0
      ) {
        throw forumError('CONFLICT', 'notInTopic');
      }
      return { chatId: input.conversationId };
    }

    const topic = await prisma.chat.findUnique({
      where: { uuid: input.topicId },
      select: {
        type: true,
        archivedAt: true,
        chatMemberships: {
          select: { userId: true, chatPermission: true, forumConversationPushOff: true },
        },
      },
    });
    const caller = topic?.chatMemberships.find((membership) => membership.userId === user.uuid);
    if (topic?.type !== ChatType.FORUM || topic.archivedAt !== null || caller === undefined) {
      throw forumError('FORBIDDEN', 'notInTopic');
    }
    const allSettings = await findForumTopicSettings([input.topicId]);
    const settings = allSettings.get(input.topicId);
    if (settings?.allowsPrivateConversations !== true) {
      throw forumError('FORBIDDEN', 'conversationsUnavailable');
    }

    const kernteam = topic.chatMemberships.filter(
      (membership) => isTopicAdmin(membership.chatPermission) && membership.userId !== user.uuid,
    );
    const piket = await getActivePiketMembers(ChatType.FORUM).catch((error: unknown) => {
      logger.error('Failed to read the forum piket on duty', { error });
      return [];
    });
    const now = new Date();
    await prisma.chat.create({
      data: {
        uuid: input.conversationId,
        name: '',
        type: ChatType.FORUM_CONVERSATION,
        forumTopicId: input.topicId,
        capabilities: FORUM_CONVERSATION_CAPABILITIES,
        chatMemberships: {
          create: [
            // never OWNER: an owner of a forum chat moderates it, see `resolveForumModerator`
            { userId: user.uuid, chatPermission: ChatMembershipPermission.MEMBER },
            ...kernteam.map((membership) => ({
              userId: membership.userId,
              chatPermission: ChatMembershipPermission.ADMIN,
              mutedAt: membership.forumConversationPushOff ? now : null,
            })),
            ...piket
              .filter(
                (member) =>
                  member.id !== user.uuid &&
                  !kernteam.some((membership) => membership.userId === member.id),
              )
              .map((member) => ({
                userId: member.id,
                chatPermission: ChatMembershipPermission.MEMBER,
              })),
          ],
        },
      },
    });
    ctx.afterTransactionCommit(() => {
      logger.info('Forum conversation opened', {
        'chat.id': input.conversationId,
        'forum.topic.id': input.topicId,
        'forum.kernteam.count': kernteam.length,
      });
    });
    return { chatId: input.conversationId };
  });

/**
 * Makes someone of the Zentrale a member of the conversation behind `postId` when they open it,
 * since no sync knows the role. A no-op for anyone else and for a post of a topic.
 */
export const joinConversationAsZentrale = async (
  prisma: PrismaClientOrTransaction,
  user: ForumUser,
  postId: string,
): Promise<void> => {
  const post = await prisma.forumPost.findUnique({
    where: { messageId: postId },
    select: {
      chat: {
        select: {
          uuid: true,
          type: true,
          chatMemberships: { where: { userId: user.uuid }, select: { userId: true } },
        },
      },
    },
  });
  if (post?.chat.type !== ChatType.FORUM_CONVERSATION) return;
  if (post.chat.chatMemberships.length > 0 || !isForumZentrale(user)) return;
  await prisma.chatMembership.upsert({
    where: { userId_chatId: { userId: user.uuid, chatId: post.chat.uuid } },
    create: {
      userId: user.uuid,
      chatId: post.chat.uuid,
      chatPermission: ChatMembershipPermission.MEMBER,
    },
    update: {},
  });
};

/** A conversation as the forum's start page lists it for its writer. */
export interface ForumConversationSummary {
  postId: string;
  chatId: string;
  title: string;
  topicName: string;
  status: ForumPostStatusValue;
  closed: boolean;
  /** answers of others the caller has not read */
  unreadCount: number;
  lastActivity: Date;
}

/** The caller's own conversations, newest activity first, open ones before closed ones. */
export const getForumConversationList = trpcBaseProcedure
  .input(z.object({}))
  .query(async ({ ctx }): Promise<ForumConversationSummary[]> => {
    const userId = ctx.user.uuid;
    const posts = await ctx.prisma.forumPost.findMany({
      where: {
        chat: { type: ChatType.FORUM_CONVERSATION, chatMemberships: { some: { userId } } },
        message: { senderId: userId, deletedAt: null },
      },
      select: {
        messageId: true,
        chatId: true,
        title: true,
        status: true,
        chat: {
          select: { status: true, lastUpdate: true, forumTopic: { select: { name: true } } },
        },
      },
      orderBy: { chat: { lastUpdate: 'desc' } },
      take: 50,
    });
    const unread = await ctx.prisma.message.groupBy({
      by: ['parentId'],
      where: {
        parentId: { in: posts.map((post) => post.messageId) },
        deletedAt: null,
        OR: [{ senderId: { not: userId } }, { senderId: null }],
        messageEvents: { none: { type: MessageEventType.READ, userId } },
      },
      _count: { _all: true },
    });
    const unreadOf = new Map(unread.map((group) => [group.parentId, group._count._all]));
    return posts
      .map((post) => ({
        postId: post.messageId,
        chatId: post.chatId,
        title: post.title,
        topicName: post.chat.forumTopic?.name ?? '',
        status: post.status,
        closed: post.chat.status === 'CLOSED',
        unreadCount: unreadOf.get(post.messageId) ?? 0,
        lastActivity: post.chat.lastUpdate,
      }))
      .toSorted((a, b) => Number(a.closed) - Number(b.closed));
  });
