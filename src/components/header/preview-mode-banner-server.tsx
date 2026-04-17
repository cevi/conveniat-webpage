import { PreviewModeBanner } from '@/components/header/preview-mode-banner';
import { auth } from '@/utils/auth';
import { isAdminSession } from '@/utils/is-admin-session';
import React from 'react';

/**
 * The preview mode banner is a small gray banner at the top of the screen and
 * is visible whenever the user is viewing a page in preview mode or is an admin.
 */
export const PreviewModeBannerServerComponent: React.FC = async () => {
  const isAdmin = await isAdminSession();

  if (!isAdmin) {
    return;
  }

  const session = await auth();

  return <PreviewModeBanner user={session?.user} canAccessAdmin />;
};
