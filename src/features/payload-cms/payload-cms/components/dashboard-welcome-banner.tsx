import {
  getUserGroups,
  hasAccessToThisUser,
  Roles,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { DashboardWelcomeBannerClient } from '@/features/payload-cms/payload-cms/components/dashboard-welcome-banner-client';
import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import type { ServerProps } from 'payload';
import type React from 'react';

/**
 * Dashboard header. Decides on the server who may see the cache and reset actions, since the
 * client component cannot read the role configuration.
 */
const DashboardWelcomeBanner: React.FC<ServerProps> = ({ user, i18n }) => {
  const showActions = hasAccessToThisUser({
    user: { groups: getUserGroups(user) },
    requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam],
  });

  return <DashboardWelcomeBannerClient locale={getAdminLocale(i18n)} showActions={showActions} />;
};

export default DashboardWelcomeBanner;
