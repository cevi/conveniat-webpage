import type {
  AdminPanelArea,
  AdminPanelDashboardGroupKey,
} from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import {
  AdminPanelAreas,
  AdminPanelDashboardGroups,
} from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { AdminEntity } from '@/features/payload-cms/payload-cms/widgets/admin-entity-access';
import {
  getAdminLocale,
  isHiddenInAdmin,
  listAdminEntities,
} from '@/features/payload-cms/payload-cms/widgets/admin-entity-access';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
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
    <div className="card">
      <div className="grid w-full gap-8 md:grid-cols-3">
        {columns.map((column) => (
          <section key={column.area} className="flex flex-col gap-4">
            <div>
              <h3 className="text-xl font-bold">{AdminPanelAreas[column.area][locale]}</h3>
              <p className="text-sm opacity-70">{areaDescriptions[column.area][locale]}</p>
            </div>
            {column.groups.map((group) => (
              <div key={group.key}>
                <h4 className="mb-1 text-xs font-semibold tracking-wide uppercase opacity-60">
                  {group.name[locale]}
                </h4>
                <ul className="flex flex-col gap-1">
                  {group.entities.map((entity) => {
                    const level = getPermissionLevel(entity, permissions);
                    return (
                      <li key={`${entity.type}-${entity.slug}`} className="flex items-center gap-2">
                        <Link
                          href={`${adminRoute}/${entity.type}/${entity.slug}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {entity.label}
                        </Link>
                        <span
                          className={cn('rounded px-1.5 py-0.5 text-[10px] leading-none', {
                            'bg-green-900/15 text-green-800 dark:bg-green-900/40 dark:text-green-300':
                              level === 'full',
                            'bg-blue-900/15 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300':
                              level === 'edit',
                            'bg-gray-500/15 opacity-70': level === 'read',
                          })}
                        >
                          {permissionLabels[level][locale]}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
