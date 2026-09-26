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
  de: 'Materialdepot einrichten',
  en: 'Set up material depot',
  fr: 'Configurer le dépôt de matériel',
};

/**
 * Sidebar link to the depot setup, for full admins. Shown whether or not the app has the
 * feature on yet, so the depot can be set up before it goes live; the page says which it is.
 */
const MaterialSetupNavLink: React.FC<ServerProps> = ({ user, payload, i18n }) => {
  const allowed = hasAccessToThisUser({
    user: { groups: getUserGroups(user) },
    requiredRoles: [Roles.FullAdmin],
  });
  // eslint-disable-next-line unicorn/no-null
  if (!allowed) return null;

  return (
    <div className="nav-group">
      <Link className="nav__link" href={`${payload.config.routes.admin}/material-setup`}>
        <span className="nav__link-label">{label[getAdminLocale(i18n)]}</span>
      </Link>
    </div>
  );
};

export default MaterialSetupNavLink;
