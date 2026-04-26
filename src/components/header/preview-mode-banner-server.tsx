import { PreviewModeBanner } from '@/components/header/preview-mode-banner';
import { hasAccessToThisUser, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { getAdminSession } from '@/utils/is-admin-session';
import { PREVIEW_SESSION_COOKIE } from '@/utils/preview-session-cookie';
import { cookies } from 'next/headers';
import React from 'react';

/**
 * The preview mode banner is a small gray banner at the top of the screen.
 *
 * It is only visible when:
 * 1. The user is an authenticated admin (has admin panel access), AND
 * 2. The user has visited the admin panel during the current browser session
 *    (indicated by the `payload-admin-visited` session cookie).
 *
 * The user can dismiss the banner via the close button, which deletes the
 * session cookie. The banner will reappear the next time they visit `/admin`.
 */
export const PreviewModeBannerServerComponent: React.FC = async () => {
  // First, check the cheap cookie — avoids the auth() call for non-admin visitors
  const cookieStore = await cookies();
  const hasVisitedAdmin = cookieStore.has(PREVIEW_SESSION_COOKIE);

  // If the user has NOT visited the admin panel, they might be a guest with a preview link.
  // We render the client component with default props, skipping expensive auth queries.
  // The client component will check searchParams and no-op if no token is present.
  if (!hasVisitedAdmin) {
    return <PreviewModeBanner user={undefined} canAccessAdmin={false} />;
  }

  // Only do expensive auth queries if they are flagged as having visited the admin panel.
  const session = await getAdminSession();
  

  if (!session) {
    return <PreviewModeBanner user={undefined} canAccessAdmin={false} />;
  }

  // TODO: for ProgramTeam, do they get access to the preview?
  const canAccessAdminDashboard = hasAccessToThisUser({
    user: isValidNextAuthUser(session?.user)
      ? { group_ids: session.user.group_ids }
      : { group_ids: [] },
    requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam],
  });
  
  return <PreviewModeBanner user={session.user} canAccessAdmin={canAccessAdminDashboard} />;
};
