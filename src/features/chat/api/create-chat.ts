'use server';

import type { Contact } from '@/features/chat/api/get-contacts';
import { PrismaClient } from '@/lib/prisma/client';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth-helpers';

const prisma = new PrismaClient();

export const createChat = async (members: Contact[], chatName: string): Promise<void> => {
  const session = await auth();
  const user = session?.user as unknown as HitobitoNextAuthUser | undefined;
  if (user === undefined) {
    throw new Error('User not authenticated');
  }

  await prisma.chat.create({
    data: {
      name: chatName,
      messages: {
        create: {
          content: 'New chat created',
          sender: {
            connect: {
              ceviDbID: user.cevi_db_uuid.toString(),
            },
          },
        },
      },
      users: {
        connect: [
          {
            ceviDbID: user.cevi_db_uuid.toString(),
          },
          ...members.map((member) => ({
            uuid: member.uuid,
          })),
        ],
      },
    },
  });
};
