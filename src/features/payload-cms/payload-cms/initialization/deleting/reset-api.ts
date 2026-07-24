'use server';

import { hasAccessToThisUser, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import config from '@payload-config';
import { redirect } from 'next/navigation';
import { getPayload } from 'payload';
import { deleteEverything, onPayloadInit } from '..';

export const resetServerData = async (): Promise<void> => {
  const session = await auth();
  if (!session) {
    throw new Error('Unauthorized');
  }

  const user = isValidNextAuthUser(session.user) ? session.user : undefined;
  if (!user) {
    throw new Error('Unauthorized');
  }

  const isAuthorized = hasAccessToThisUser({
    user,
    requiredRoles: [Roles.FullAdmin],
  });

  if (!isAuthorized) {
    throw new Error('Unauthorized');
  }

  const payload = await getPayload({ config });
  await deleteEverything(payload);
  await onPayloadInit(payload);

  redirect('/admin/logout');
};
