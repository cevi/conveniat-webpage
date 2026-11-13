import { USER_RELEVANT_MESSAGE_EVENTS } from '@/features/chat/api/definitions';
import type { ChatMessage } from '@/features/chat/api/types';
import { findDeletedQuotedMessageIds } from '@/features/chat/api/utils/deleted-messages';
import { getStatusFromMessageEvents } from '@/features/chat/api/utils/get-status-from-message-events';
import { findThreadSummaries } from '@/features/chat/api/utils/thread-summaries';
import { toChatMessage } from '@/features/chat/api/utils/to-chat-message';
import { findTopicAdminIds } from '@/features/chat/api/utils/topic-admins';
import { ChatType, MessageEventType } from '@/lib/prisma/enums';
import { trpcBaseProcedure } from '@/trpc/init';
import { createLogger } from '@/utils/server-logger';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const logger = createLogger('chat:messages');

export const getChatMessages = trpcBaseProcedure
  .input(
    z.object({
      chatId: z.uuid(),
      cursor: z.string().nullish(), // Use message UUID as cursor
      limit: z.number().min(1).max(100).default(25),
      parentId: z.uuid().optional(),
    }),
  )
  .query(
    async ({ input, ctx }): Promise<{ items: ChatMessage[]; nextCursor: string | undefined }> => {
      const { chatId, cursor, limit, parentId } = input;
      const { prisma } = ctx;

      // Verify chat existence and access
      const chat = await prisma.chat.findUnique({
        where: { uuid: chatId },
        include: {
          chatMemberships: {
            where: { userId: ctx.user.uuid },
          },
        },
      });

      if (!chat || chat.chatMemberships.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Chat with ID ${chatId} not found or access denied`,
        });
      }

      // A forum topic's posts come from the forum router, its chat lists only the comments of
      // one post, and those of a private report or a post waiting for approval only to whom
      // sees it. Loaded here, so a chat does not pull in the piket schedule the check reads.
      if (chat.type === ChatType.FORUM && parentId !== undefined) {
        const { canSeeForumPost, findForumPostVisibility } =
          await import('@/features/chat/api/forum/forum-visibility');
        const post = await findForumPostVisibility(prisma, parentId);
        if (post !== undefined && !(await canSeeForumPost(prisma, ctx.user, post))) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Chat with ID ${chatId} not found or access denied`,
          });
        }
      }

      logger.debug('Fetching chat messages', {
        'chat.id': chatId,
        'chat.cursor': cursor,
        'chat.limit': limit,
        'chat.parent_id': parentId,
      });

      const messages = await prisma.message.findMany({
        take: limit + 1, // Get an extra item at the end to know if there's a next page
        where: {
          chatId: chat.uuid,
          parentId: parentId ?? null,
          ...((chat.type === ChatType.FORUM || chat.type === ChatType.FORUM_CONVERSATION) &&
          parentId === undefined
            ? { forumPost: null }
            : {}),
        },
        ...(cursor == undefined ? {} : { cursor: { uuid: cursor }, skip: 1 }),
        orderBy: { seq: 'desc' },
        include: {
          messageEvents: {
            where: { type: { in: USER_RELEVANT_MESSAGE_EVENTS } },
            orderBy: { uuid: 'desc' },
          },
          contentVersions: {
            take: 1,
            orderBy: { revision: 'desc' },
          },
          sender: { select: { name: true } },
          reactions: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          replies: {
            where: {
              senderId: { not: ctx.user.uuid },
              messageEvents: {
                none: {
                  type: MessageEventType.READ,
                  userId: ctx.user.uuid,
                },
              },
            },
            take: 1, // We only need to know if at least one exists
          },
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (messages.length > limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem?.uuid;
      }

      logger.debug('Chat message page resolved', {
        'chat.id': chatId,
        'chat.count': messages.length,
        'chat.limit': limit,
        'chat.next_cursor': nextCursor,
      });

      const [deletedQuotedIds, threads, topicAdminIds] = await Promise.all([
        findDeletedQuotedMessageIds(
          prisma,
          messages.map((message) => message.contentVersions[0]?.payload),
        ),
        findThreadSummaries(
          prisma,
          messages.map((message) => message.uuid),
        ),
        findTopicAdminIds(
          prisma,
          chat,
          messages.map((message) => message.senderId),
        ),
      ]);

      // the function behind each of their badges; loaded only then, as it reads Payload
      const kernteamLabels =
        topicAdminIds.size === 0
          ? undefined
          : await import('@/features/chat/api/forum/forum-kernteam-labels').then(
              ({ findKernteamLabelsOfTopic }) =>
                findKernteamLabelsOfTopic(
                  prisma,
                  // a conversation's Kernteam is its topic's
                  chat.forumTopicId ?? chat.uuid,
                  topicAdminIds,
                  ctx.locale,
                ),
            );

      // hidden and deleted comments of a forum thread: their placeholders, and their content
      // only for their writer and the moderators
      const forumRemovals =
        chat.type === ChatType.FORUM || chat.type === ChatType.FORUM_CONVERSATION
          ? await import('@/features/chat/api/forum/forum-visibility').then(
              ({ describeForumRemovals }) =>
                describeForumRemovals(prisma, ctx.user, chat.uuid, messages),
            )
          : undefined;

      const mappedMessages = messages.map((message) => {
        const isReadByAdmin = chat.adminReadAt !== null && message.createdAt <= chat.adminReadAt;
        return toChatMessage(message, {
          status: isReadByAdmin
            ? MessageEventType.READ
            : getStatusFromMessageEvents(message.messageEvents),
          deletedQuotedIds,
          threads,
          topicAdminIds,
          ...(kernteamLabels === undefined ? {} : { kernteamLabels }),
          ...(forumRemovals === undefined
            ? {}
            : {
                forumRemovals: forumRemovals.removals,
                hiddenIds: forumRemovals.hidden,
                forumFlags: forumRemovals.flags,
              }),
        });
      });

      return {
        items: mappedMessages,
        nextCursor,
      };
    },
  );
