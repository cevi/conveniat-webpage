import type {
  AdminPanelArea,
  AdminPanelDashboardGroupKey,
} from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import {
  AdminPanelAreas,
  AdminPanelDashboardGroups,
} from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { AdminViewEntry } from '@/features/payload-cms/payload-cms/components/admin-nav/admin-nav-groups';
import { listAdminViewEntries } from '@/features/payload-cms/payload-cms/components/admin-nav/admin-nav-groups';
import type { AdminEntity } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import {
  getAdminLocale,
  isHiddenInAdmin,
  listAdminEntities,
} from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Pill } from '@payloadcms/ui';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { SanitizedPermissions, WidgetServerProps } from 'payload';
import type React from 'react';

const AREA_ORDER: AdminPanelArea[] = ['webpage', 'app', 'backoffice'];

const areaDescriptions: Record<AdminPanelArea, StaticTranslationString> = {
  webpage: {
    de: 'Die öffentliche Webseite: Seiten, Medien und Formulare.',
    en: 'The public website: pages, media and forms.',
    fr: 'Le site web public : pages, médias et formulaires.',
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

/** One link of a group: a collection, a global or a custom view. */
interface AreaRow {
  key: string;
  href: string;
  label: string;
  readOnly: boolean;
  /** a page of the app, opened in a new tab like in the sidebar */
  external: boolean;
}

interface GroupColumn {
  key: AdminPanelDashboardGroupKey | 'other';
  name: StaticTranslationString;
  rows: AreaRow[];
}

interface AreaColumn {
  area: AdminPanelArea;
  groups: GroupColumn[];
}

/**
 * Groups what the current user can open by area and sidebar group, in sidebar order: the
 * collections and globals, and the custom views where the sidebar puts them.
 */
const buildAreaColumns = (
  entities: AdminEntity[],
  views: AdminViewEntry[],
  toRow: (entity: AdminEntity) => AreaRow,
): AreaColumn[] => {
  const groupKeys = Object.keys(AdminPanelDashboardGroups) as AdminPanelDashboardGroupKey[];
  const viewRow = ({ link }: AdminViewEntry): AreaRow => ({
    key: link.id,
    href: link.href,
    label: link.label,
    readOnly: false,
    external: link.external === true,
  });

  return AREA_ORDER.map((area) => {
    const groups: GroupColumn[] = groupKeys
      .filter((key) => AdminPanelDashboardGroups[key].area === area)
      .map((key) => {
        const ofGroup = views.filter((view) => view.group === key);
        return {
          key,
          name: AdminPanelDashboardGroups[key].name,
          rows: [
            ...ofGroup.filter((view) => view.first).map((view) => viewRow(view)),
            ...entities.filter((entity) => entity.groupKey === key).map((entity) => toRow(entity)),
            ...ofGroup.filter((view) => !view.first).map((view) => viewRow(view)),
          ],
        };
      });

    if (area === 'backoffice') {
      groups.push({
        key: 'other',
        name: otherGroupName,
        rows: entities
          .filter((entity) => entity.groupKey === undefined)
          .map((entity) => toRow(entity)),
      });
    }

    return { area, groups: groups.filter((group) => group.rows.length > 0) };
  }).filter((column) => column.groups.length > 0);
};

/**
 * Dashboard widget that lists every collection, global and custom view the current user can
 * open, sorted into the three areas of the admin panel, with the user's own level of access.
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
  const columns = buildAreaColumns(
    visibleEntities,
    listAdminViewEntries({ user, locale, adminRoute }),
    (entity) => ({
      key: `${entity.type}-${entity.slug}`,
      href: `${adminRoute}/${entity.type}/${entity.slug}`,
      label: entity.label,
      readOnly: getPermissionLevel(entity, permissions) === 'read',
      external: false,
    }),
  );

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
                {group.rows.map((row) => (
                  // as tall as the pill, so a row with one keeps the rhythm of the rows without
                  <li key={row.key} className="flex min-h-[24px] items-center gap-2">
                    <Link
                      href={row.href}
                      className="no-underline hover:underline"
                      {...(row.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {row.label}
                    </Link>
                    {row.external && (
                      <ExternalLink
                        className="h-3.5 w-3.5 text-(--theme-elevation-500)"
                        aria-hidden="true"
                      />
                    )}
                    {row.readOnly && (
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
