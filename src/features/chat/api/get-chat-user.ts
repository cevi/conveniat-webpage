'use server';

import prisma from '@/features/chat/database';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth-helpers';

export const fetchChatUser = async (): Promise<string> => {
  const session = await auth();
  const user = session?.user as unknown as HitobitoNextAuthUser | undefined;
  if (user === undefined) {
    throw new Error('User not authenticated');
  }

  const prismaUser = await prisma.user.findUniqueOrThrow({
    where: { uuid: user.uuid },
  });

  return prismaUser.uuid;
};
