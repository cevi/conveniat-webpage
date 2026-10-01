import {
  getUserGroups,
  hasAccessToThisUser,
  MATERIAL_DEPOT_ROLES,
  Roles,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { AdminPanelDashboardGroupKey } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { ClientUser, StaticLabel, TypedUser } from 'payload';

/** A sidebar group as Payload's `groupNavItems` returns it. */
export interface AdminEntityGroup {
  label: string;
  entities: { slug: string; type: 'collections' | 'globals'; label: StaticLabel }[];
}

export interface AdminNavLink {
  id: string;
  href: string;
  label: string;
}

export interface AdminNavGroup {
  label: string;
  links: AdminNavLink[];
}

interface AdminViewLink {
  /** Path below the admin route, as the view is registered in `admin.components.views`. */
  path: string;
  label: StaticTranslationString;
  group: AdminPanelDashboardGroupKey;
  /** Who gets the link. The view checks the same roles again before it renders. */
  requiredRoles: Roles[];
}

/**
 * The custom admin views that have a sidebar entry. Payload only sorts collections and globals
 * into its sidebar groups, so a view is listed here to join one.
 */
const ADMIN_VIEW_LINKS: AdminViewLink[] = [
  {
    path: '/access-overview',
    label: {
      de: 'Zugriff nach Cevi.DB-Gruppe',
      en: 'Access by Cevi.DB group',
      fr: 'Accès par groupe Cevi.DB',
    },
    group: 'BackofficePeople',
    requiredRoles: [Roles.FullAdmin],
  },
  {
    // Listed whether or not the app has the feature on yet, so the depot can be set up before it
    // goes live; the page says which it is.
    path: '/material-setup',
    label: {
      de: 'Materialdepot einrichten',
      en: 'Set up material depot',
      fr: 'Configurer le dépôt de matériel',
    },
    group: 'BackofficeHoefeAndMaterial',
    requiredRoles: MATERIAL_DEPOT_ROLES,
  },
];

const translateLabel = (label: StaticLabel, locale: Locale): string =>
  typeof label === 'string' ? label : (label[locale] ?? label['de'] ?? '');

/**
 * Turns Payload's sidebar groups into the links the admin nav renders and adds the custom views
 * the user may open to their group. A view whose group holds nothing else the user can see
 * opens that group at the end, which is how the material team gets its single entry.
 */
export const buildAdminNavGroups = ({
  entityGroups,
  user,
  locale,
  adminRoute,
}: {
  entityGroups: AdminEntityGroup[];
  user: ClientUser | TypedUser | null | undefined;
  locale: Locale;
  adminRoute: string;
}): AdminNavGroup[] => {
  const groups: AdminNavGroup[] = entityGroups.map(({ label, entities }) => ({
    label,
    links: entities.map((entity) => ({
      // the ids Payload gives the links of its own nav
      id: entity.type === 'globals' ? `nav-global-${entity.slug}` : `nav-${entity.slug}`,
      href: `${adminRoute}/${entity.type}/${entity.slug}`,
      label: translateLabel(entity.label, locale),
    })),
  }));

  const userGroups = getUserGroups(user);
  for (const view of ADMIN_VIEW_LINKS) {
    if (!hasAccessToThisUser({ user: { groups: userGroups }, requiredRoles: view.requiredRoles })) {
      continue;
    }
    const groupLabel = AdminPanelDashboardGroups[view.group].label[locale];
    let group = groups.find((candidate) => candidate.label === groupLabel);
    if (group === undefined) {
      group = { label: groupLabel, links: [] };
      groups.push(group);
    }
    group.links.push({
      id: `nav-view-${view.path.slice(1)}`,
      href: `${adminRoute}${view.path}`,
      label: view.label[locale],
    });
  }

  return groups;
};
