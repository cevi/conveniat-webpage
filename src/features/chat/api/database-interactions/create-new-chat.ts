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

export const createNewChat = async (
  finalChatName: string,
  locale: Locale,
  user: HitobitoNextAuthUser,
  members: ChatMembership[],
  prisma: PrismaClientOrTransaction,
): Promise<NewlyCreatedChat> => {
  // assert that the user is not in the members list
  if (members.some((member) => member.userId === user.uuid)) {
    throw new Error('User cannot be a member of the chat they are creating.');
  }

  const isGroupChat = members.length > 1;

  return await prisma.chat.create({
    data: {
      name: finalChatName,
      type: isGroupChat ? ChatType.GROUP : ChatType.ONE_TO_ONE,
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
    },
  });
};
