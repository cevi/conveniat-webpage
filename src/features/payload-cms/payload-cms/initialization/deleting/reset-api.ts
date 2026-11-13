'use server';

import { environmentVariables } from '@/config/environment-variables';
import { hasAccessToThisUser, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { redirect } from 'next/navigation';
import { getPayload } from 'payload';
import { deleteEverything, onPayloadInit } from '..';

const logger = createLogger('payload:reset-instance');

/**
 * Wipes every collection and runs the initialization again. Only a local development instance
 * may do this: a server action is reachable by anyone who knows its id, so hiding the button is
 * not enough, and the check has to come before anything else.
 */
export const resetServerData = async (): Promise<void> => {
  if (environmentVariables.NODE_ENV !== 'development') {
    logger.warn('Refused to reset the instance outside of development');
    throw new Error('Resetting the instance is only allowed in development');
  }

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
