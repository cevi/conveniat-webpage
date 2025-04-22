'use server';

import { PrismaClient } from '@/lib/prisma';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth-helpers';

const prisma = new PrismaClient();

export const fetchChatUser = async (): Promise<string> => {
  const session = await auth();
  const user = session?.user as unknown as HitobitoNextAuthUser | undefined;
  if (user === undefined) {
    throw new Error('User not authenticated');
  }

  const prismaUser = await prisma.user.findUniqueOrThrow({
    where: {
      ceviDbID: user.cevi_db_uuid.toString(),
    },
  });

  return prismaUser.uuid;
};
