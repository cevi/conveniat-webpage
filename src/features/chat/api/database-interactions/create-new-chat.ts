import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { Locale, PrismaClientOrTransaction, StaticTranslationString } from '@/types/types';
import { ChatMembershipPermission, MessageEventType, MessageType } from '@prisma/client';

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
  isArchived: boolean;
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
  return await prisma.chat.create({
    data: {
      name: finalChatName,
      messages: {
        create: {
          content: newChatText[locale],
          type: MessageType.SYSTEM,
          messageEvents: {
            create: {
              eventType: MessageEventType.CREATED,
            },
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
