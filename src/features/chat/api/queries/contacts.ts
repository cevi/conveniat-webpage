import { trpcBaseProcedure } from '@/trpc/init';
import { z } from 'zod';

export interface Contact {
  userId: string;
  name: string;
}

export const contacts = trpcBaseProcedure
  .input(z.object({})) // no input needed for this query
  .query(async ({ ctx }) => {
    const { user, prisma } = ctx;

    const _contacts = await prisma.user.findMany({
      where: {
        uuid: {
          not: user.uuid,
        },
      },
      select: {
        uuid: true,
        name: true,
      },
    });

    return _contacts.map((contact) => ({
      userId: contact.uuid,
      name: contact.name,
    }));
  });
