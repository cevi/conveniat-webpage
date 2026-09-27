import { isUserMemberOfChat } from '@/features/chat/api/checks/is-user-member-of-chat';
import { USER_RELEVANT_MESSAGE_EVENTS } from '@/features/chat/api/definitions';
import type { ChatDetails } from '@/features/chat/api/types';
import { formatCaseNumber } from '@/features/chat/api/utils/case-number-utils';
import { getStatusFromMessageEvents } from '@/features/chat/api/utils/get-status-from-message-events';
import { resolveChatName } from '@/features/chat/api/utils/resolve-chat-name';
import { MessageEventType } from '@/lib/prisma/client';
import { trpcBaseProcedure } from '@/trpc/init';
import { profilePictureUrlOrUndefined } from '@/utils/profile-picture-url';
import { createLogger } from '@/utils/server-logger';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const logger = createLogger('chat:queries');

export const getChat = trpcBaseProcedure
  .input(z.object({ chatId: z.string().uuid() }))
  .query(async ({ input, ctx }): Promise<ChatDetails> => {
    const { chatId } = input;
    const { user, prisma } = ctx;

    const chat = await prisma.chat.findUnique({
      where: { uuid: chatId },
      include: {
        messages: {
          // eslint-disable-next-line unicorn/no-null
          where: { parentId: null },
          orderBy: { createdAt: 'desc' }, // Get newest messages first
          take: 25, // limit to the last 25 messages
          include: {
            messageEvents: {
              where: { type: { in: USER_RELEVANT_MESSAGE_EVENTS } },
              orderBy: { uuid: 'desc' },
            },
            contentVersions: {
              take: 1, // include only the latest content version
              orderBy: { revision: 'desc' },
            },
            sender: { select: { name: true } },
          },
        },
        chatMemberships: { include: { user: true } },
      },
    });

    // A chat the user is not a member of answers exactly like one that does not exist, as in
    // `getChatMessages`: chat ids are not secret (a course hands out the id of its group chat
    // to everyone), so the id alone must not unlock the participants and the last messages.
    if (chat === null || !isUserMemberOfChat(user, chat.chatMemberships)) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Chat with ID ${chatId} not found or access denied`,
      });
    }

    const messages = chat.messages;
    if (messages.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No messages found in chat with ID ${chatId} `,
      });
    }

    const lastMessage = messages.at(-1);
    if (lastMessage === undefined) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No last message found in chat with ID ${chatId} `,
      });
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
    } catch (error) {
      // Fallback to the prisma user names if the Payload query fails.
      logger.warn('Falling back to prisma user names, the Payload user query failed', {
        error,
        'chat.id': chatId,
      });
    }

    return {
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
      id: chat.uuid,
      archivedAt: chat.archivedAt,
      type: chat.type,
      status: chat.status,
      caseNumber: formatCaseNumber(chat.caseNumber),
      courseId: chat.courseId,
      // Reverse to chronological order (we fetched in desc to get newest 25)
      messages: [...messages].reverse().map((message) => {
        const isReadByAdmin = chat.adminReadAt !== null && message.createdAt <= chat.adminReadAt;
        return {
          id: message.uuid,
          createdAt: message.createdAt,
          messagePayload: message.contentVersions[0]?.payload ?? {},
          senderId: message.senderId ?? undefined,
          ...(message.sender?.name ? { senderName: message.sender.name } : {}),
          status: isReadByAdmin
            ? MessageEventType.READ
            : getStatusFromMessageEvents(message.messageEvents),
          type: message.type,
        };
      }),
      participants: (chat.type === 'ANNOUNCEMENT'
        ? chat.chatMemberships.filter((membership) => membership.user.uuid === user.uuid)
        : chat.chatMemberships
      ).map((membership) => ({
        id: membership.user.uuid,
        name: membership.user.name,
        isOnline: membership.user.lastSeen > new Date(Date.now() - 30 * 1000),
        chatPermission: membership.chatPermission,
        description: membership.user.description,
        pictureUrl: profilePictureUrlOrUndefined(
          membership.user.uuid,
          membership.user.profilePictureVersion,
        ),
      })),
      capabilities: chat.capabilities,
      description: chat.description,
    };
  });
