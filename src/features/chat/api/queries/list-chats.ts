/* eslint-disable unicorn/no-null */
import { formatCaseNumber } from '@/features/chat/api/utils/case-number-utils';
import { findCmsUserNames } from '@/features/chat/api/utils/find-cms-user-names';
import { getMessagePreviewText } from '@/features/chat/api/utils/get-message-preview-text';
import { resolveChatName } from '@/features/chat/api/utils/resolve-chat-name';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import {
  LARGE_CHAT_THRESHOLD,
  SYSTEM_SENDER_ID,
  USER_RELEVANT_MESSAGE_EVENTS,
  getStatusFromMessageEvents,
  isChatArchived,
} from '@/lib/chat-shared';
import { ChatType, MessageEventType, MessageType, type Prisma } from '@/lib/prisma';
import { trpcBaseProcedure } from '@/trpc/init';
import type { StaticTranslationString } from '@/types/types';
import { profilePictureUrlOrUndefined } from '@/utils/profile-picture-url';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

/**
 * Puts the chats pinned for everyone first, then the ones the caller pinned, the latest pin
 * first, then the rest. Within the first and the last group the chats keep the order they
 * came in, most recent first.
 */
const sortChatList = <T extends { pinned: boolean; membership: { pinnedAt: Date | null } }>(
  chats: T[],
): T[] => {
  const ownPinTime = (chat: T): number =>
    chat.pinned ? 0 : (chat.membership.pinnedAt?.getTime() ?? 0);
  const rank = (chat: T): number => {
    if (chat.pinned) return 0;
    return chat.membership.pinnedAt === null ? 2 : 1;
  };
  return chats.toSorted((a, b) => {
    const byRank = rank(a) - rank(b);
    return byRank === 0 ? ownPinTime(b) - ownPinTime(a) : byRank;
  });
};

/**
 * The chat list of the caller.
 *
 * Every open client refetches this list when its stream resyncs, so its cost must not grow with
 * the size of the chats in it: it reads the caller's own membership and a member count per chat,
 * and other members only for one-to-one chats, which are named after the other person. It runs
 * outside a transaction because it only reads, and a transaction would hold its pooled
 * connection across every query and the Payload lookup.
 */
export const getChatList = trpcBaseProcedure
  .input(z.object({}))
  .query(async ({ ctx }): Promise<ChatWithMessagePreview[]> => {
    const { user, prisma } = ctx;

    const prismaUser = await prisma.user.findUnique({
      where: { uuid: user.uuid },
      select: { uuid: true },
    });

    if (prismaUser === null) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: `User with UUID ${user.uuid} not found in the database`,
      });
    }

    const memberships = await prisma.chatMembership.findMany({
      where: { userId: prismaUser.uuid, hasDeleted: false },
      select: {
        lastReadMessageId: true,
        chatPermission: true,
        pinnedAt: true,
        mutedAt: true,
        markedUnread: true,
        chat: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: { select: { name: true } },
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
            _count: { select: { messages: true, chatMemberships: true } },
          },
        },
      },
      orderBy: { chat: { lastUpdate: 'desc' } },
    });
    const _chats = sortChatList(
      memberships.map(({ chat, ...membership }) => ({ ...chat, membership })),
    );

    // 1. Prepare unread count conditions for all chats and fetch them in a single batch groupBy query
    const unreadCountMap = new Map<string, number>();

    if (_chats.length > 0) {
      const lastReadIds = _chats
        .map((chat) => chat.membership.lastReadMessageId)
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
          const lastReadId = chat.membership.lastReadMessageId;
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
            // a deleted message has nothing left to read
            deletedAt: null,
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

    // One-to-one chats are named after, and show the picture of, the other person.
    const oneToOneChatIds = _chats
      .filter((chat) => chat.type === ChatType.ONE_TO_ONE)
      .map((chat) => chat.uuid);
    const partnerMemberships =
      oneToOneChatIds.length > 0
        ? await prisma.chatMembership.findMany({
            where: { chatId: { in: oneToOneChatIds }, userId: { not: prismaUser.uuid } },
            select: {
              chatId: true,
              user: { select: { uuid: true, name: true, profilePictureVersion: true } },
            },
          })
        : [];
    const partnerMap = new Map(
      partnerMemberships.map((membership) => [membership.chatId, membership.user]),
    );
    const cmsUsersMap = await findCmsUserNames(partnerMemberships.map((m) => m.user.uuid));

    // 2. Map retrieved chats synchronously to their DTO representation
    return _chats.map((chat): ChatWithMessagePreview => {
      const lastMessage = chat.messages[0];

      const fallbackPreview: StaticTranslationString = {
        de: 'Neuer Chat erstellt',
        en: 'New Chat created',
        fr: 'Nouveau chat créé',
      };

      const messagePreview = lastMessage ? getMessagePreviewText(lastMessage) : fallbackPreview;

      const partnerUser = partnerMap.get(chat.uuid);
      const isLarge = chat._count.chatMemberships >= LARGE_CHAT_THRESHOLD;

      const rawCount = unreadCountMap.get(chat.uuid) ?? 0;
      const messageUnreadCount = isLarge && rawCount > 0 ? 1 : rawCount;
      // a chat the user marked unread counts as one unread message until they open it
      const unreadCount =
        chat.membership.markedUnread && messageUnreadCount === 0 ? 1 : messageUnreadCount;
      const isPinnedByMe = chat.membership.pinnedAt !== null;

      return {
        unreadCount,
        lastUpdate: chat.lastUpdate,
        name: resolveChatName(
          chat.name,
          partnerUser === undefined
            ? []
            : [
                {
                  name: partnerUser.name,
                  uuid: partnerUser.uuid,
                  fullName: cmsUsersMap.get(partnerUser.uuid)?.fullName,
                  nickname: cmsUsersMap.get(partnerUser.uuid)?.nickname,
                },
              ],
          user,
          chat.type,
        ),
        description: chat.description,
        status: chat.status,
        chatType: chat.type,
        caseNumber: formatCaseNumber(chat.caseNumber),
        id: chat.uuid,
        messageCount: chat._count.messages,
        isLarge,
        isPinned: chat.pinned || isPinnedByMe,
        isPinnedForEveryone: chat.pinned,
        isPinnedByMe,
        isMuted: chat.membership.mutedAt !== null,
        isMarkedUnread: chat.membership.markedUnread,
        lastMessage: {
          id: lastMessage?.uuid ?? chat.uuid,
          createdAt: chat.lastUpdate,
          messagePreview,
          senderId: lastMessage?.senderId ?? SYSTEM_SENDER_ID,
          ...(typeof lastMessage?.sender?.name === 'string' && lastMessage.sender.name !== ''
            ? { senderName: lastMessage.sender.name }
            : {}),
          status: lastMessage
            ? getStatusFromMessageEvents(lastMessage.messageEvents)
            : MessageEventType.STORED,
        },
        userChatPermission: chat.membership.chatPermission,
        isArchived: isChatArchived(chat),
        ...(chat.type === ChatType.ONE_TO_ONE && partnerUser !== undefined
          ? {
              partner: {
                userId: partnerUser.uuid,
                pictureUrl: profilePictureUrlOrUndefined(
                  partnerUser.uuid,
                  partnerUser.profilePictureVersion,
                ),
              },
            }
          : {}),
      };
    });
  });
