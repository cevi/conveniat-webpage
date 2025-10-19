import { PreviewModeBanner } from '@/components/header/preview-mode-banner';
import { canUserAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import React from 'react';

/**
 *
 * The preview mode banner is a small gray banner at the top of the screen and
 * is visible whenever the user is viewing at a page in preview mode.
 * The preview banner is part of the previewing system.
 *
 * The preview banner cannot be closed while a page in preview mode is visited.
 * If the visiting user is a Payload admin (e.g. a user that can access the admin panel).
 * The preview banner becomes visible as soon as the user has signed in to the Payload CMS and
 * visited the admin panel (see middleware.ts).
 *
 * The preview banner can be closed (e.g. hidden away) whenever a non-preview page is accessed.
 * The preview banner of a non-payload admin is only visible on the specific page that is in preview mode.
 *
 */
export const PreviewModeBannerServerComponent: React.FC = async () => {
  const { auth } = await import('@/utils/auth');
  const session = await auth();

  const canAccessAdminDashboard = await canUserAccessAdminPanel({
    user: session?.user as HitobitoNextAuthUser,
  });

  return <PreviewModeBanner user={session?.user} canAccessAdmin={canAccessAdminDashboard} />;
};
