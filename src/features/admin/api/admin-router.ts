import type { ChatCapability } from '@/lib/chat-shared';
import {
  ChatStatus,
  getStatusFromMessageEvents,
  SYSTEM_SENDER_ID,
  USER_RELEVANT_MESSAGE_EVENTS,
} from '@/lib/chat-shared';
import { FEATURE_FLAG_SEND_MESSAGES } from '@/lib/feature-flags';
// eslint-disable-next-line import/no-restricted-paths
import { getMessagePreviewText } from '@/features/chat/api/utils/get-message-preview-text';
// eslint-disable-next-line import/no-restricted-paths
import { resolveChatName } from '@/features/chat/api/utils/resolve-chat-name';
// eslint-disable-next-line import/no-restricted-paths
import { sendNotification } from '@/features/chat/api/utils/send-push-notifications';
// eslint-disable-next-line import/no-restricted-paths
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { hasAccessToThisUser, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { chatPubSub } from '@/lib/db/chat-pubsub';
import { getFeatureFlag, setFeatureFlag } from '@/lib/db/redis';
import {
  ChatMembershipPermission,
  ChatType,
  MessageEventType,
  MessageType,
} from '@/lib/prisma/client';
import { MINIO_BUCKET_NAME, s3ClientPublic } from '@/lib/s3';
import { createTRPCRouter, trpcBaseProcedure } from '@/trpc/init';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const adminProcedure = trpcBaseProcedure.use(async ({ ctx, next }) => {
  const hasAccess = hasAccessToThisUser({
    user: ctx.user,
    requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam],
  });
  if (!hasAccess) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});

export const adminRouter = createTRPCRouter({
  // Feature Flags
  getFeatureFlags: adminProcedure.query(async () => {
    // List of known flags
    const flags = [FEATURE_FLAG_SEND_MESSAGES];
    const result = await Promise.all(
      flags.map(async (key) => ({
        key,
        isEnabled: await getFeatureFlag(key),
      })),
    );
    return result;
  }),

  // Generic Chat Management
  getChatList: adminProcedure
    .input(
      z
        .object({
          search: z.string().trim().max(100).optional(),
          type: z.nativeEnum(ChatType).optional(),
          page: z.number().min(1).optional().default(1),
          limit: z.number().min(1).max(100).optional().default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { prisma } = ctx;

      const filters: Prisma.ChatWhereInput[] = [];

      if (input?.type) {
        filters.push({ type: input.type });
      }

      if (input?.search) {
        const search = input.search;
        filters.push({
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            {
              chatMemberships: {
                some: {
                  user: {
                    name: { contains: search, mode: 'insensitive' },
                  },
                },
              },
            },
          ],
        });
      }

      const whereClause: Prisma.ChatWhereInput = filters.length > 0 ? { AND: filters } : {};

      const page = input?.page ?? 1;
      const limit = input?.limit ?? 20;
      const skip = (page - 1) * limit;

      const [chats, total] = await Promise.all([
        prisma.chat.findMany({
          where: whereClause,
          include: {
            chatMemberships: {
              include: {
                user: { select: { name: true, uuid: true } },
              },
            },
            _count: { select: { messages: true } },
          },
          orderBy: { lastUpdate: 'desc' },
          skip,
          take: limit,
        }),
        prisma.chat.count({ where: whereClause }),
      ]);

      return {
        chats: chats.map((chat) => ({
          id: chat.uuid,
          name: chat.name,
          description: chat.description,
          status: chat.status,
          type: chat.type,
          capabilities: chat.capabilities,
          lastUpdate: chat.lastUpdate,
          messageCount: chat._count.messages,
          members: chat.chatMemberships.map((m) => ({
            name: m.user.name,
            uuid: m.userId,
          })),
        })),
        total,
        page,
        limit,
      };
    }),

  toggleFeatureFlag: adminProcedure
    .input(z.object({ key: z.string(), isEnabled: z.boolean() }))
    .mutation(async ({ input }) => {
      await setFeatureFlag(input.key, input.isEnabled);
      return { success: true };
    }),

  // Support Chats
  listSupportChats: trpcBaseProcedure
    .input(
      z
        .object({
          status: z.nativeEnum(ChatStatus).optional(),
          search: z.string().optional(),
          type: z.nativeEnum(ChatType).optional(),
          includeId: z.string().uuid().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }): Promise<ChatWithMessagePreview[]> => {
      const { prisma, user } = ctx;

      const filters: Prisma.ChatWhereInput[] = [{ type: input?.type ?? ChatType.SUPPORT_GROUP }];

      if (input?.status) {
        filters.push({ status: input.status });
      }

      if (input?.search) {
        const search = input.search;
        filters.push({
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            {
              chatMemberships: {
                some: {
                  user: {
                    name: { contains: search, mode: 'insensitive' },
                  },
                },
              },
            },
            {
              messages: {
                some: {
                  contentVersions: {
                    some: {
                      payload: {
                        path: ['en'],
                        string_contains: search,
                      },
                    },
                  },
                },
              },
            },
            {
              messages: {
                some: {
                  contentVersions: {
                    some: {
                      payload: {
                        path: ['de'],
                        string_contains: search,
                      },
                    },
                  },
                },
              },
            },
          ],
        });
      }

      const whereClause: Prisma.ChatWhereInput = input?.includeId
        ? {
            OR: [{ AND: filters }, { uuid: input.includeId }],
          }
        : { AND: filters };

      const chats = await prisma.chat.findMany({
        where: whereClause,
        include: {
          chatMemberships: {
            include: {
              user: { select: { name: true, uuid: true } },
            },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
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
          _count: { select: { messages: true } },
        },
        orderBy: { lastUpdate: 'desc' },
      });

      return chats.map((chat): ChatWithMessagePreview => {
        const messages = chat.messages.sort(
          (m1, m2) => m1.createdAt.getTime() - m2.createdAt.getTime(),
        );
        const lastMessage = messages.at(-1);

        if (lastMessage === undefined) {
          // Admin view: Handle empty chats gracefully if needed, or throw.
          // Assuming all support chats have at least a creation message?
          // If not, we might need to handle this. For now throwing consistent with list-chats.
          // BUT: listSupportChats might return chats without messages if they are just created via some other means?
          // Let's safe guard.
          return {
            id: chat.uuid,
            name: resolveChatName(
              chat.name,
              chat.chatMemberships.map((membership) => ({
                name: membership.user.name,
                uuid: membership.userId,
              })),
              user,
            ),
            description: chat.description,
            status: chat.status,
            chatType: chat.type,
            lastUpdate: chat.lastUpdate,
            unreadCount: 0,
            messageCount: chat._count.messages,
            lastMessage: {
              id: 'unknown',
              createdAt: chat.lastUpdate,
              messagePreview: 'No messages',
              senderId: SYSTEM_SENDER_ID,
              status: MessageEventType.CREATED,
            },
            userChatPermission: ChatMembershipPermission.ADMIN,
          };
        }

        return {
          unreadCount: messages
            .filter((message) => message.senderId !== user.uuid)
            .filter((message) => {
              const lastRead = chat.adminReadAt ? chat.adminReadAt.getTime() : 0;
              return message.createdAt.getTime() > lastRead;
            })
            .filter(
              (message) =>
                !message.messageEvents.some((event) => event.type === MessageEventType.READ),
            ).length,
          lastUpdate: chat.lastUpdate,
          name: resolveChatName(
            chat.name,
            chat.chatMemberships.map((membership) => ({
              name: membership.user.name,
              uuid: membership.userId,
            })),
            user,
          ),
          description: chat.description,
          status: chat.status,
          chatType: chat.type,
          id: chat.uuid,
          messageCount: chat._count.messages,
          lastMessage: {
            id: lastMessage.uuid,
            createdAt: lastMessage.createdAt,
            messagePreview: getMessagePreviewText(lastMessage),
            senderId: lastMessage.senderId ?? SYSTEM_SENDER_ID,
            status: getStatusFromMessageEvents(lastMessage.messageEvents),
          },
          userChatPermission: ChatMembershipPermission.ADMIN,
        };
      });
    }),

  toggleChatCapability: adminProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        capability: z.string(),
        isEnabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma } = ctx;
      const chat = await prisma.chat.findUnique({
        where: { uuid: input.chatId },
        select: { capabilities: true },
      });

      if (!chat) throw new TRPCError({ code: 'NOT_FOUND' });

      const newCapabilities = input.isEnabled
        ? [...new Set([...chat.capabilities, input.capability as ChatCapability])]
        : chat.capabilities.filter((c) => (c as string) !== input.capability);

      return prisma.chat.update({
        where: { uuid: input.chatId },
        data: { capabilities: newCapabilities },
      });
    }),

  getChatMessages: adminProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { prisma, user } = ctx;

      const chat = await prisma.chat.findUnique({
        where: { uuid: input.chatId },
        include: {
          chatMemberships: {
            select: { userId: true },
          },
        },
      });

      if (!chat) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Chat not found',
        });
      }

      const customerIds = new Set(chat.chatMemberships.map((m) => m.userId));

      const messages = await prisma.message.findMany({
        where: { chatId: input.chatId },
        include: {
          contentVersions: {
            orderBy: { revision: 'desc' },
            take: 1,
          },
          sender: { select: { name: true, uuid: true } },
          messageEvents: {
            where: { type: { in: USER_RELEVANT_MESSAGE_EVENTS } },
            orderBy: { uuid: 'desc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const formattedMessages = messages.map((m) => {
        const senderId = m.senderId ?? SYSTEM_SENDER_ID;
        const isAdminMessage = senderId !== SYSTEM_SENDER_ID && !customerIds.has(senderId);

        return {
          id: m.uuid,
          createdAt: m.createdAt,
          messagePayload: m.contentVersions[0]?.payload ?? {},
          senderId,
          senderName: m.sender?.name,
          type: m.type,
          status: getStatusFromMessageEvents(m.messageEvents),
          isAdminMessage,
        };
      });

      return {
        messages: formattedMessages,
        currentUserId: user.uuid,
      };
    }),

  markChatAsRead: adminProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { prisma, user } = ctx;

      await prisma.chat.update({
        where: { uuid: input.chatId },
        data: { adminReadAt: new Date() },
      });

      // Publish real-time event to update standard users' checkmarks instantly
      void chatPubSub.publish({
        type: 'chat_read_by_admin',
        chatId: input.chatId,
        senderId: user.uuid,
      });

      return { success: true };
    }),

  postAdminMessage: adminProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        content: z.string().min(1),
        type: z.nativeEnum(MessageType).optional().default(MessageType.TEXT_MSG),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma, user } = ctx;

      const chat = await prisma.chat.findUnique({
        where: { uuid: input.chatId },
        select: { chatMemberships: true },
      });

      if (!chat) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Chat not found' });
      }

      const message = await prisma.message.create({
        data: {
          chatId: input.chatId,
          senderId: user.uuid,
          type: input.type,
          contentVersions: {
            create: {
              payload:
                input.type === MessageType.IMAGE_MSG ? { url: input.content } : input.content,
            },
          },
          messageEvents: {
            create: [
              { type: MessageEventType.CREATED, userId: user.uuid },
              { type: MessageEventType.STORED },
            ],
          },
        },
      });

      await prisma.chat.update({
        where: { uuid: input.chatId },
        data: { lastUpdate: new Date() },
      });

      const recipientUserIds = chat.chatMemberships
        .filter((membership) => membership.userId !== user.uuid)
        .map((membership) => membership.userId);

      sendNotification(input.content, recipientUserIds, input.chatId, message.uuid).catch(
        (error: unknown) => {
          console.error('Failed to send admin push notification:', error);
        },
      );

      if (recipientUserIds.length > 0) {
        await prisma.messageEvent.createMany({
          data: recipientUserIds.map((userId) => ({
            userId: userId,
            messageId: message.uuid,
            type: MessageEventType.DISTRIBUTED,
          })),
        });
      }

      // Publish real-time event via PostgreSQL NOTIFY (fire-and-forget)
      chatPubSub
        .publish({
          type: 'new_message',
          chatId: input.chatId,
          senderId: user.uuid,
          message: {
            id: message.uuid,
            createdAt: message.createdAt,
            messagePayload:
              input.type === MessageType.IMAGE_MSG
                ? { url: input.content }
                : { text: input.content },
            senderId: user.uuid,
            senderName: user.name,
            status: MessageEventType.STORED,
            type: input.type,
            parentId: undefined,
          },
        })
        .catch((error: unknown) => {
          console.error('Failed to publish real-time admin event:', error);
        });

      return message;
    }),

  getAdminUploadUrl: adminProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        fileName: z.string(),
        contentType: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { chatId, fileName, contentType } = input;

      // Generate a unique key for the file
      const fileExtension = fileName.split('.').pop();
      const uniqueFileName = `${chatId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExtension}`;
      const key = `chat-images/${uniqueFileName}`;

      // Generate pre-signed PUT URL
      const command = new PutObjectCommand({
        Bucket: MINIO_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
      });

      const url = await getSignedUrl(s3ClientPublic, command, { expiresIn: 3600 });

      return {
        url,
        key,
      };
    }),

  closeChat: adminProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { prisma, user } = ctx;
      const chat = await prisma.chat.findUnique({
        where: { uuid: input.chatId },
        select: { capabilities: true, type: true },
      });

      if (!chat) throw new TRPCError({ code: 'NOT_FOUND' });
      const closeMessages: Record<ChatType, { en: string; de: string; fr: string }> = {
        [ChatType.EMERGENCY]: {
          en: `${user.name} has marked the emergency alert as completed.`,
          de: `${user.name} hat die Notfallmeldung als abgeschlossen markiert.`,
          fr: `${user.name} a marqué l'alerte d'urgence comme terminée.`,
        },
        [ChatType.SUPPORT_GROUP]: {
          en: `${user.name} has marked this issue as resolved.`,
          de: `${user.name} hat dieses Problem als gelöst markiert.`,
          fr: `${user.name} a marqué ce problème comme résolu.`,
        },
        [ChatType.GROUP]: {
          en: 'An admin has closed this chat.',
          de: 'Ein Admin hat diesen Chat geschlossen.',
          fr: 'Un administrateur a fermé ce chat.',
        },
        [ChatType.ONE_TO_ONE]: {
          en: 'An admin has closed this chat.',
          de: 'Ein Admin hat diesen Chat geschlossen.',
          fr: 'Un administrateur a fermé ce chat.',
        },
        [ChatType.COURSE_GROUP]: {
          en: 'An admin has closed this chat.',
          de: 'Ein Admin hat diesen Chat geschlossen.',
          fr: 'Un administrateur a fermé ce chat.',
        },
        [ChatType.ANNOUNCEMENT]: {
          en: 'This announcement channel has been closed.',
          de: 'Dieser Ankündigungskanal wurde geschlossen.',
          fr: "Ce canal d'annonces a été fermé.",
        },
      };

      // Add system message
      const systemMessage = await prisma.message.create({
        data: {
          chatId: input.chatId,
          type: MessageType.SYSTEM_MSG,
          contentVersions: {
            create: {
              payload: {
                ...closeMessages[chat.type],
                systemMessageType: 'CHAT_CLOSED',
              },
            },
          },
          messageEvents: {
            create: [
              { type: MessageEventType.CREATED, userId: user.uuid },
              { type: MessageEventType.STORED },
            ],
          },
        },
      });

      const updatedChat = await prisma.chat.update({
        where: { uuid: input.chatId },
        data: {
          status: ChatStatus.CLOSED,
          lastUpdate: new Date(),
        },
      });

      // Publish real-time system message event via PostgreSQL NOTIFY
      chatPubSub
        .publish({
          type: 'new_message',
          chatId: input.chatId,
          senderId: SYSTEM_SENDER_ID,
          message: {
            id: systemMessage.uuid,
            createdAt: systemMessage.createdAt,
            messagePayload: {
              ...closeMessages[chat.type],
              systemMessageType: 'CHAT_CLOSED',
            },
            senderId: SYSTEM_SENDER_ID,
            status: MessageEventType.STORED,
            type: MessageType.SYSTEM_MSG,
            parentId: undefined,
          },
        })
        .catch((error: unknown) => {
          console.error('Failed to publish real-time system event on close:', error);
        });

      // Publish chat_updated event
      chatPubSub
        .publish({
          type: 'chat_updated',
          chatId: input.chatId,
          senderId: SYSTEM_SENDER_ID,
          chat: {
            status: ChatStatus.CLOSED,
            capabilities: chat.capabilities,
          },
        })
        .catch((error: unknown) => {
          console.error('Failed to publish chat_updated event on close:', error);
        });

      return updatedChat;
    }),

  reopenChat: adminProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { prisma, user } = ctx;
      const chat = await prisma.chat.findUnique({
        where: { uuid: input.chatId },
        select: { capabilities: true, type: true },
      });

      if (!chat) throw new TRPCError({ code: 'NOT_FOUND' });

      const reopenMessages: Record<ChatType, { en: string; de: string; fr: string }> = {
        [ChatType.EMERGENCY]: {
          en: `${user.name} has reopened the emergency alert.`,
          de: `${user.name} hat die Notfallmeldung wieder geöffnet.`,
          fr: `${user.name} a rouvert l'alerte d'urgence.`,
        },
        [ChatType.SUPPORT_GROUP]: {
          en: `${user.name} has reopened this issue.`,
          de: `${user.name} hat dieses Problem wieder geöffnet.`,
          fr: `${user.name} a rouvert ce problème.`,
        },
        [ChatType.GROUP]: {
          en: 'An admin has reopened this chat.',
          de: 'Ein Admin hat diesen Chat wieder geöffnet.',
          fr: 'Un administrateur a rouvert ce chat.',
        },
        [ChatType.ONE_TO_ONE]: {
          en: 'An admin has reopened this chat.',
          de: 'Ein Admin hat diesen Chat wieder geöffnet.',
          fr: 'Un administrateur a rouvert ce chat.',
        },
        [ChatType.COURSE_GROUP]: {
          en: 'An admin has reopened this chat.',
          de: 'Ein Admin hat diesen Chat wieder geöffnet.',
          fr: 'Un administrateur a rouvert ce chat.',
        },
        [ChatType.ANNOUNCEMENT]: {
          en: 'This announcement channel has been reopened.',
          de: 'Dieser Ankündigungskanal wurde wieder geöffnet.',
          fr: "Ce canal d'annonces a été rouvert.",
        },
      };

      // Add system message
      const systemMessage = await prisma.message.create({
        data: {
          chatId: input.chatId,
          type: MessageType.SYSTEM_MSG,
          contentVersions: {
            create: {
              payload: {
                ...reopenMessages[chat.type],
                systemMessageType: 'CHAT_REOPENED',
              },
            },
          },
          messageEvents: {
            create: [
              { type: MessageEventType.CREATED, userId: user.uuid },
              { type: MessageEventType.STORED },
            ],
          },
        },
      });

      const updatedChat = await prisma.chat.update({
        where: { uuid: input.chatId },
        data: {
          status: ChatStatus.OPEN,
          lastUpdate: new Date(),
        },
      });

      // Publish real-time system message event via PostgreSQL NOTIFY
      chatPubSub
        .publish({
          type: 'new_message',
          chatId: input.chatId,
          senderId: SYSTEM_SENDER_ID,
          message: {
            id: systemMessage.uuid,
            createdAt: systemMessage.createdAt,
            messagePayload: {
              ...reopenMessages[chat.type],
              systemMessageType: 'CHAT_REOPENED',
            },
            senderId: SYSTEM_SENDER_ID,
            status: MessageEventType.STORED,
            type: MessageType.SYSTEM_MSG,
            parentId: undefined,
          },
        })
        .catch((error: unknown) => {
          console.error('Failed to publish real-time system event on reopen:', error);
        });

      // Publish chat_updated event
      chatPubSub
        .publish({
          type: 'chat_updated',
          chatId: input.chatId,
          senderId: SYSTEM_SENDER_ID,
          chat: {
            status: ChatStatus.OPEN,
            capabilities: chat.capabilities,
          },
        })
        .catch((error: unknown) => {
          console.error('Failed to publish chat_updated event on reopen:', error);
        });

      return updatedChat;
    }),
});
