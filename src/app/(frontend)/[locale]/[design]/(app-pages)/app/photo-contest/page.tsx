import { hasAccessToThisUser, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { PhotoContestView } from '@/features/photo-contest/components/photo-contest-view';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import type React from 'react';

export default async function PhotoContestPage(): Promise<React.ReactElement> {
  const session = await auth();
  let isAdmin = false;

  if (session?.user && isValidNextAuthUser(session.user)) {
    isAdmin = hasAccessToThisUser({
      user: session.user,
      requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam],
    });
  }

  return <PhotoContestView isAdminUser={isAdmin} />;
}
