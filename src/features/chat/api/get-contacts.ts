'use server';

import { PrismaClient } from '@/lib/prisma';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth-helpers';

const prisma = new PrismaClient();

export interface Contact {
  uuid: string;
  name: string;
}

export const fetchAllContacts = async (): Promise<Contact[]> => {
  const session = await auth();
  const user = session?.user as unknown as HitobitoNextAuthUser | undefined;

  if (user === undefined) {
    throw new Error('User not authenticated');
  }

  const contacts = await prisma.user.findMany({
    where: {
      ceviDbID: {
        not: user.cevi_db_uuid.toString(),
      },
    },
    select: {
      uuid: true,
      name: true,
    },
  });

  return contacts.map((contact) => ({
    uuid: contact.uuid,
    name: contact.name,
  }));
};
