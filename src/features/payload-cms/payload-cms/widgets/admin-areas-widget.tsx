import type {
  AdminPanelArea,
  AdminPanelDashboardGroupKey,
} from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import {
  AdminPanelAreas,
  AdminPanelDashboardGroups,
} from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { AdminEntity } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import {
  getAdminLocale,
  isHiddenInAdmin,
  listAdminEntities,
} from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Pill } from '@payloadcms/ui';
import Link from 'next/link';
import type { SanitizedPermissions, WidgetServerProps } from 'payload';
import type React from 'react';

const AREA_ORDER: AdminPanelArea[] = ['webpage', 'app', 'backoffice'];

const areaDescriptions: Record<AdminPanelArea, StaticTranslationString> = {
  webpage: {
    de: 'Die öffentliche Webseite: Seiten, Blog, Medien und Formulare.',
    en: 'The public website: pages, blog, media and forms.',
    fr: 'Le site web public : pages, blog, médias et formulaires.',
  },
  app: {
    de: 'Inhalte und Betrieb der App für Teilnehmende und Helfende.',
    en: 'Content and operation of the app for participants and helpers.',
    fr: "Contenu et exploitation de l'app pour les participants et les helpers.",
  },
  backoffice: {
    de: 'Personen, Rechnungen und technische Verwaltung.',
    en: 'People, billing and technical administration.',
    fr: 'Personnes, facturation et administration technique.',
  },
};

const otherGroupName: StaticTranslationString = { de: 'Weitere', en: 'Other', fr: 'Autres' };

type PermissionLevel = 'full' | 'edit' | 'read';

const permissionLabels: Record<PermissionLevel, StaticTranslationString> = {
  full: { de: 'Vollzugriff', en: 'Full access', fr: 'Accès complet' },
  edit: { de: 'Bearbeiten', en: 'Edit', fr: 'Modifier' },
  read: { de: 'Nur lesen', en: 'Read only', fr: 'Lecture seule' },
};

const getPermissionLevel = (
  entity: AdminEntity,
  permissions: SanitizedPermissions,
): PermissionLevel => {
  if (entity.type === 'globals') {
    return permissions.globals?.[entity.slug]?.update ? 'edit' : 'read';
  }
  const collection = permissions.collections?.[entity.slug];
  if (collection?.create && collection.update && collection.delete) return 'full';
  if (collection?.update) return 'edit';
  return 'read';
};

const canRead = (entity: AdminEntity, permissions: SanitizedPermissions): boolean =>
  Boolean(permissions[entity.type]?.[entity.slug]?.read);

interface GroupColumn {
  key: AdminPanelDashboardGroupKey | 'other';
  name: StaticTranslationString;
  entities: AdminEntity[];
}

interface AreaColumn {
  area: AdminPanelArea;
  groups: GroupColumn[];
}

/**
 * Groups the entities the current user can see by area and sidebar group, in sidebar order.
 */
const buildAreaColumns = (entities: AdminEntity[]): AreaColumn[] => {
  const groupKeys = Object.keys(AdminPanelDashboardGroups) as AdminPanelDashboardGroupKey[];

  return AREA_ORDER.map((area) => {
    const groups: GroupColumn[] = groupKeys
      .filter((key) => AdminPanelDashboardGroups[key].area === area)
      .map((key) => ({
        key,
        name: AdminPanelDashboardGroups[key].name,
        entities: entities.filter((entity) => entity.groupKey === key),
      }));

    if (area === 'backoffice') {
      groups.push({
        key: 'other',
        name: otherGroupName,
        entities: entities.filter((entity) => entity.groupKey === undefined),
      });
    }

    return { area, groups: groups.filter((group) => group.entities.length > 0) };
  }).filter((column) => column.groups.length > 0);
};

/**
 * Dashboard widget that lists every collection and global the current user can open, sorted
 * into the three areas of the admin panel, with the user's own level of access.
 */
export default function AdminAreasWidget({
  req,
  permissions,
}: WidgetServerProps): React.ReactElement {
  const { payload, i18n, user } = req;
  const locale: Locale = getAdminLocale(i18n);
  const adminRoute = payload.config.routes.admin;

  const visibleEntities = listAdminEntities(payload.config, i18n).filter(
    (entity) => !isHiddenInAdmin(entity, user) && canRead(entity, permissions),
  );
  const columns = buildAreaColumns(visibleEntities);

  return (
    // one card per area, on the 12px gap of the dashboard grid, so they line up with the row above
    <div className="grid h-full gap-[12px] md:grid-cols-3">
      {columns.map((column) => (
        <section key={column.area} className="card h-full flex-col justify-start gap-5">
          <div>
            <h3 className="m-0 text-xl font-semibold">{AdminPanelAreas[column.area][locale]}</h3>
            <p className="m-0 mt-1 text-sm text-(--theme-elevation-500)">
              {areaDescriptions[column.area][locale]}
            </p>
          </div>
          {column.groups.map((group) => (
            <div key={group.key}>
              <h4 className="m-0 mb-1 text-sm font-semibold tracking-wide text-(--theme-elevation-500) uppercase">
                {group.name[locale]}
              </h4>
              <ul className="m-0 flex list-none flex-col p-0">
                {group.entities.map((entity) => (
                  // as tall as the pill, so a row with one keeps the rhythm of the rows without
                  <li
                    key={`${entity.type}-${entity.slug}`}
                    className="flex min-h-[24px] items-center gap-2"
                  >
                    <Link
                      href={`${adminRoute}/${entity.type}/${entity.slug}`}
                      className="no-underline hover:underline"
                    >
                      {entity.label}
                    </Link>
                    {getPermissionLevel(entity, permissions) === 'read' && (
                      <Pill pillStyle="light-gray" size="small">
                        {permissionLabels.read[locale]}
                      </Pill>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
