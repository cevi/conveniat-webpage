import { ChatCapability } from '@/lib/chat-shared';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { Locale, PrismaClientOrTransaction, StaticTranslationString } from '@/types/types';
import { ChatMembershipPermission, ChatType, MessageEventType, MessageType } from '@prisma/client';

const newChatText: StaticTranslationString = {
  de: 'Neuer Chat erstellt',
  en: 'New Chat created',
  fr: 'Nouveau chat créé',
};

export interface NewlyCreatedChat {
  uuid: string;
  name: string;
  createdAt: Date;
  lastUpdate: Date;
  archivedAt: Date | null;
}

export interface ChatMembership {
  userId: string;
}

export interface CreateChatOptions {
  courseId?: string;
  chatType?: ChatType;
}

export const createNewChat = async (
  finalChatName: string,
  locale: Locale,
  user: HitobitoNextAuthUser,
  members: ChatMembership[],
  prisma: PrismaClientOrTransaction,
  options?: CreateChatOptions,
): Promise<NewlyCreatedChat> => {
  // assert that the user is not in the members list
  if (members.some((member) => member.userId === user.uuid)) {
    throw new Error('User cannot be a member of the chat they are creating.');
  }

  const isGroupChat = members.length > 1;
  const chatType = options?.chatType ?? (isGroupChat ? ChatType.GROUP : ChatType.ONE_TO_ONE);

  const chat = await prisma.chat.create({
    data: {
      name: finalChatName,
      type: chatType,
      // eslint-disable-next-line unicorn/no-null
      courseId: options?.courseId ?? null,
      messages: {
        create: {
          contentVersions: { create: [{ payload: newChatText[locale] }] },
          type: MessageType.SYSTEM_MSG,
          messageEvents: {
            create: [{ type: MessageEventType.CREATED }, { type: MessageEventType.STORED }],
          },
        },
      },
      chatMemberships: {
        create: [
          {
            user: { connect: { uuid: user.uuid } },
            chatPermission: ChatMembershipPermission.OWNER,
          },
          ...members.map((member) => ({
            user: { connect: { uuid: member.userId } },
          })),
        ],
      },
      capabilities: [ChatCapability.CAN_SEND_MESSAGES, ChatCapability.THREADS],
    },
  });

  // Publish the real-time new_chat event to all participants so their sidebars update instantly
  import('@/lib/db/chat-pubsub')
    .then(({ chatPubSub }) => {
      const participantUuids = [user.uuid, ...members.map((m) => m.userId)];
      for (const uuid of participantUuids) {
        chatPubSub
          .publish(uuid, {
            type: 'new_chat',
            chatId: uuid,
            senderId: user.uuid,
          })
          .catch((error: unknown) => {
            console.error(`Failed to publish new_chat event to user ${uuid}:`, error);
          });
      }
    })
    .catch((error: unknown) => {
      console.error('Failed to import chatPubSub for new_chat event:', error);
    });

  return chat;
};
