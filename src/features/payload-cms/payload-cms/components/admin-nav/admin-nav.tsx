import { AdminNavClient } from '@/features/payload-cms/payload-cms/components/admin-nav/admin-nav-client';
import { buildAdminNavGroups } from '@/features/payload-cms/payload-cms/components/admin-nav/admin-nav-groups';
import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import { NavHamburger, NavWrapper } from '@payloadcms/next/client';
import { Logout } from '@payloadcms/ui';
import { groupNavItems } from '@payloadcms/ui/shared';
import type { NavPreferences, PayloadRequest, ServerProps } from 'payload';
import { EntityType } from 'payload';
import { PREFERENCE_KEYS } from 'payload/shared';
import type React from 'react';

/** Which sidebar groups the user has collapsed. */
const getNavPreferences = async (
  request: PayloadRequest | undefined,
): Promise<NavPreferences | undefined> => {
  if (!request?.user) return undefined;
  const { docs } = await request.payload.find({
    collection: 'payload-preferences',
    depth: 0,
    limit: 1,
    pagination: false,
    req: request,
    where: {
      and: [
        { key: { equals: PREFERENCE_KEYS.NAV } },
        { 'user.relationTo': { equals: request.user.collection } },
        { 'user.value': { equals: request.user.id } },
      ],
    },
  });
  return docs[0]?.value as NavPreferences | undefined;
};

/**
 * The sidebar of the admin panel, in place of Payload's `DefaultNav`.
 *
 * Payload sorts only collections and globals into its sidebar groups and offers no way to add a
 * custom view to one; `afterNavLinks` puts it below all groups. This nav is Payload's own, built
 * from the same parts, with the custom views of `admin-nav-groups.ts` placed in their group.
 *
 * It renders none of the nav slots of `admin.components` (`beforeNav`, `beforeNavLinks`,
 * `afterNavLinks`, `afterNav`, `settingsMenu`, `logout`) and no folder button, because the
 * config uses none of them. Add the slot here before you configure one.
 */
const AdminNav: React.FC<ServerProps & { req?: PayloadRequest }> = async ({
  i18n,
  payload,
  permissions,
  req,
  user,
  visibleEntities,
}) => {
  // eslint-disable-next-line unicorn/no-null
  if (permissions === undefined || visibleEntities === undefined) return null;
  const { collections, globals, routes } = payload.config;

  const entityGroups = groupNavItems(
    [
      ...collections
        .filter(({ slug }) => visibleEntities.collections.includes(slug))
        .map((entity) => ({ type: EntityType.collection as const, entity })),
      ...globals
        .filter(({ slug }) => visibleEntities.globals.includes(slug))
        .map((entity) => ({ type: EntityType.global as const, entity })),
    ],
    permissions,
    i18n,
  );
  const groups = buildAdminNavGroups({
    entityGroups,
    user,
    locale: getAdminLocale(i18n),
    adminRoute: routes.admin,
  });
  const navPreferences = await getNavPreferences(req);

  return (
    <NavWrapper baseClass="nav">
      <nav className="nav__wrap">
        <AdminNavClient groups={groups} navPreferences={navPreferences} />
        <div className="nav__controls">
          <Logout />
        </div>
      </nav>
      <div className="nav__header">
        <div className="nav__header-content">
          <NavHamburger baseClass="nav" />
        </div>
      </div>
    </NavWrapper>
  );
};

export default AdminNav;
