'use server';

import prisma from '@/features/chat/database';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth-helpers';

export const onlinePing = async (): Promise<void> => {
  const session = await auth();
  const user = session?.user as unknown as HitobitoNextAuthUser | undefined;
  if (user === undefined) {
    throw new Error('User not authenticated');
  }

  await prisma.user.update({
    where: { uuid: user.uuid },
    data: {
      lastSeen: new Date(),
    },
  });
};
