import {
  getUserGroups,
  hasAccessToThisUser,
  Roles,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import type { StaticTranslationString } from '@/types/types';
import Link from 'next/link';
import type { ServerProps } from 'payload';
import type React from 'react';

const label: StaticTranslationString = {
  de: 'Zugriff nach Cevi.DB-Gruppe',
  en: 'Access by Cevi.DB group',
  fr: 'Accès par groupe Cevi.DB',
};

/**
 * Sidebar link to the access overview, rendered after the collection groups for full admins.
 */
const AccessOverviewNavLink: React.FC<ServerProps> = ({ user, payload, i18n }) => {
  const isFullAdmin = hasAccessToThisUser({
    user: { groups: getUserGroups(user) },
    requiredRoles: [Roles.FullAdmin],
  });
  // eslint-disable-next-line unicorn/no-null
  if (!isFullAdmin) return null;

  return (
    <div className="nav-group">
      <Link className="nav__link" href={`${payload.config.routes.admin}/access-overview`}>
        <span className="nav__link-label">{label[getAdminLocale(i18n)]}</span>
      </Link>
    </div>
  );
};

export default AccessOverviewNavLink;
