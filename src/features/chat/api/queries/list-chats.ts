/* eslint-disable unicorn/no-null */
import { formatCaseNumber } from '@/features/chat/api/utils/case-number-utils';
import { getMessagePreviewText } from '@/features/chat/api/utils/get-message-preview-text';
import { resolveChatName } from '@/features/chat/api/utils/resolve-chat-name';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import {
  LARGE_CHAT_THRESHOLD,
  SYSTEM_SENDER_ID,
  USER_RELEVANT_MESSAGE_EVENTS,
  getStatusFromMessageEvents,
} from '@/lib/chat-shared';
import { ChatMembershipPermission, MessageType, type Prisma } from '@/lib/prisma';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const getChatList = trpcBaseProcedure
  .input(z.object({}))
  .use(databaseTransactionWrapper)
  .query(async ({ ctx }): Promise<ChatWithMessagePreview[]> => {
    const { user, prisma } = ctx;

    const prismaUser = await prisma.user.findUnique({
      where: { uuid: user.uuid },
    });

    if (prismaUser === null) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: `User with UUID ${user.uuid} not found in the database`,
      });
    }

    const _chats = await prisma.chat.findMany({
      where: {
        chatMemberships: {
          some: {
            userId: prismaUser.uuid,
            hasDeleted: false,
          },
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            messageEvents: {
              where: { type: { in: USER_RELEVANT_MESSAGE_EVENTS } },
              orderBy: { uuid: 'desc' },
            },
            contentVersions: {
              take: 1, // include only the latest content version
              orderBy: { revision: 'desc' },
            },
          },
        },
        chatMemberships: { include: { user: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { lastUpdate: 'desc' },
    });

    // 1. Prepare unread count conditions for all chats and fetch them in a single batch groupBy query
    const unreadCountMap = new Map<string, number>();

    if (_chats.length > 0) {
      const lastReadIds = _chats
        .map((chat) => {
          const membership = chat.chatMemberships.find((m) => m.userId === prismaUser.uuid);
          return membership?.lastReadMessageId;
        })
        .filter((id): id is string => typeof id === 'string' && id.trim() !== '');

      const lastReadMessages =
        lastReadIds.length > 0
          ? await prisma.message.findMany({
              where: { uuid: { in: lastReadIds } },
              select: { uuid: true, createdAt: true },
            })
          : [];

      const lastReadMap = new Map<string, Date>(lastReadMessages.map((m) => [m.uuid, m.createdAt]));

      const unreadQueries = _chats
        .map((chat) => {
          const currentUserMembership = chat.chatMemberships.find(
            (m) => m.userId === prismaUser.uuid,
          );
          const lastReadId = currentUserMembership?.lastReadMessageId;
          const lastMessage = chat.messages[0];

          const isReadUpToLatest =
            Boolean(lastReadId) && Boolean(lastMessage) && lastReadId === lastMessage?.uuid;

          const lastReadCreatedAt = lastReadId ? lastReadMap.get(lastReadId) : undefined;

          const innerConditions: Prisma.MessageWhereInput[] = [];

          if (!isReadUpToLatest) {
            if (lastReadCreatedAt && lastReadId) {
              innerConditions.push({
                parentId: null,
                OR: [
                  { createdAt: { gt: lastReadCreatedAt } },
                  {
                    createdAt: lastReadCreatedAt,
                    uuid: { gt: lastReadId },
                  },
                ],
              });
            } else {
              innerConditions.push({
                parentId: null,
              });
            }
          }

          innerConditions.push({
            parentId: { not: null },
            messageEvents: {
              none: {
                type: 'READ',
                userId: prismaUser.uuid,
              },
            },
          });

          const baseCondition: Prisma.MessageWhereInput = {
            chatId: chat.uuid,
            AND: [
              {
                OR: [
                  { senderId: { not: prismaUser.uuid } },
                  { senderId: null },
                  { type: MessageType.SYSTEM_MSG },
                ],
              },
              {
                OR: innerConditions,
              },
            ],
          };

          return baseCondition;
        })
        .filter(Boolean);

      if (unreadQueries.length > 0) {
        const unreadCounts = await prisma.message.groupBy({
          by: ['chatId'],
          where: {
            OR: unreadQueries,
          },
          _count: {
            uuid: true,
          },
        });

        for (const item of unreadCounts) {
          unreadCountMap.set(item.chatId, item._count.uuid);
        }
      }
    }

    const cmsUsersMap = new Map<
      string,
      { fullName?: string; nickname?: string | null | undefined }
    >();
    try {
      const { getPayload } = await import('payload');
      const { default: config } = await import('@payload-config');
      const payload = await getPayload({ config });

      const cmsUsers = await payload.find({
        collection: 'users',
        limit: 1000,
        depth: 0,
      });

      for (const u of cmsUsers.docs) {
        cmsUsersMap.set(u.id, {
          fullName: u.fullName,
          nickname: u.nickname,
        });
      }
    } catch {
      // Fallback if Payload query fails
    }

    // 2. Map retrieved chats synchronously to their DTO representation
    return _chats.map((chat): ChatWithMessagePreview => {
      const lastMessage = chat.messages[0];

      if (lastMessage === undefined) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `No last message found in chat with ID ${chat.uuid}`,
        });
      }

      const currentUserMembership = chat.chatMemberships.find((m) => m.userId === prismaUser.uuid);
      const isLarge = chat.chatMemberships.length >= LARGE_CHAT_THRESHOLD;

      const rawCount = unreadCountMap.get(chat.uuid) ?? 0;
      const unreadCount = isLarge && rawCount > 0 ? 1 : rawCount;

      return {
        unreadCount,
        lastUpdate: chat.lastUpdate,
        name: resolveChatName(
          chat.name,
          chat.chatMemberships.map((membership) => {
            const cmsUser = cmsUsersMap.get(membership.user.uuid);
            return {
              name: membership.user.name,
              uuid: membership.user.uuid,
              fullName: cmsUser?.fullName,
              nickname: cmsUser?.nickname,
            };
          }),
          user,
          chat.type,
        ),
        description: chat.description,
        status: chat.status,
        chatType: chat.type,
        caseNumber: formatCaseNumber(chat.caseNumber),
        id: chat.uuid,
        messageCount: chat._count.messages,
        lastMessage: {
          id: lastMessage.uuid,
          createdAt: chat.lastUpdate,
          messagePreview: getMessagePreviewText(lastMessage),
          senderId: lastMessage.senderId ?? SYSTEM_SENDER_ID,
          status: getStatusFromMessageEvents(lastMessage.messageEvents),
        },
        userChatPermission: currentUserMembership?.chatPermission ?? ChatMembershipPermission.GUEST,
      };
    });
  });
