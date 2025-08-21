import { trpcBaseProcedure } from '@/trpc/init';
import { z } from 'zod';

export interface Contact {
  userId: string;
  name: string;
}

/**
 * Lists all the contacts of the current user.
 *
 * Currently, this is a query that returns all users except the current user.
 * In the future, there might be a more sophisticated way to limit the viewable contacts,
 * to users which
 */
export const listContacts = trpcBaseProcedure
  .input(z.object({})) // no input needed for this query
  .query(async ({ ctx }) => {
    const { user, prisma } = ctx;

    const _contacts = await prisma.user.findMany({
      where: { uuid: { not: user.uuid } },
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
