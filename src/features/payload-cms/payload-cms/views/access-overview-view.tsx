import { environmentVariables } from '@/config/environment-variables';
import {
  isFullAdmin,
  ROLE_ENVIRONMENT_VARIABLES,
  Roles,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { AdminPanelArea } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import {
  AdminPanelAreas,
  AdminPanelDashboardGroups,
} from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { AccessOverviewUserPicker } from '@/features/payload-cms/payload-cms/components/access-overview/access-overview-user-picker';
import type {
  AccessOperation,
  AdminEntity,
  EntityAccess,
} from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import {
  ACCESS_OVERVIEW_USER_PARAMETER,
  getAdminLocale,
  listAdminEntities,
} from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import type {
  Capability,
  GroupColumn,
  Person,
  SubjectAccess,
} from '@/features/payload-cms/payload-cms/views/access-overview-data';
import {
  listCapabilities,
  loadEveryoneAccess,
  loadGroupColumns,
  loadPerson,
} from '@/features/payload-cms/payload-cms/views/access-overview-data';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter, SetStepNav } from '@payloadcms/ui';
import { CheckIcon, CodeXmlIcon, EyeIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { AdminViewServerProps } from 'payload';
import { stringify } from 'qs-esm';
import type React from 'react';
import { Fragment } from 'react';

const AREA_ORDER: AdminPanelArea[] = ['webpage', 'app', 'backoffice'];

const title: StaticTranslationString = {
  de: 'Zugriff nach Cevi.DB-Gruppe',
  en: 'Access by Cevi.DB group',
  fr: 'Accès par groupe Cevi.DB',
};

const intro: StaticTranslationString = {
  de: 'Wer was darf, ergibt sich allein aus der Mitgliedschaft in Cevi.DB-Gruppen. Eine Gruppe trägt eine oder mehrere Rollen, und eine Person erhält die Rechte aller ihrer Gruppen.',
  en: 'What someone may do follows from membership in Cevi.DB groups alone. A group holds one or more roles, and a person gets the rights of all their groups.',
  fr: "Ce que chacun peut faire découle uniquement de l'appartenance à des groupes Cevi.DB. Un groupe porte un ou plusieurs rôles, et une personne cumule les droits de tous ses groupes.",
};

const personLabel: StaticTranslationString = { de: 'Person', en: 'Person', fr: 'Personne' };

const pickerPlaceholder: StaticTranslationString = {
  de: 'Person suchen: Name, Ceviname oder E-Mail',
  en: 'Find a person: name, Cevi name or email',
  fr: 'Chercher une personne : nom, nom Cevi ou e-mail',
};

const pickerNoResults: StaticTranslationString = {
  de: 'Niemand gefunden',
  en: 'Nobody found',
  fr: 'Personne trouvé',
};

const pickerSearchFailed: StaticTranslationString = {
  de: 'Die Suche ist fehlgeschlagen.',
  en: 'The search failed.',
  fr: 'La recherche a échoué.',
};

const youLabel: StaticTranslationString = { de: 'du', en: 'you', fr: 'toi' };

const groupsLabel: StaticTranslationString = {
  de: 'Gruppen mit Rolle',
  en: 'Groups with a role',
  fr: 'Groupes avec un rôle',
};

const noRoleGroupsLabel: StaticTranslationString = {
  de: 'In keiner Gruppe mit Rolle: kein Zugriff auf das Adminpanel.',
  en: 'In no group with a role: no access to the admin panel.',
  fr: "Dans aucun groupe avec un rôle : pas d'accès au panneau d'administration.",
};

const otherGroupsLabel: StaticTranslationString = {
  de: 'weitere Gruppen ohne Rolle',
  en: 'more groups without a role',
  fr: 'autres groupes sans rôle',
};

const lastLoginNote: StaticTranslationString = {
  de: 'Stand der letzten Anmeldung der Person. Eine Änderung in der Cevi.DB wirkt erst, wenn sie sich neu anmeldet.',
  en: "As of the person's last login. A change in Cevi.DB takes effect once they log in again.",
  fr: 'État à la dernière connexion de la personne. Un changement dans Cevi.DB ne prend effet que lorsqu’elle se reconnecte.',
};

const hofDashboardHoefeLabel: StaticTranslationString = {
  de: 'Hof-Dashboard von',
  en: 'Hof dashboard of',
  fr: 'Tableau de bord du Hof de',
};

const groupLabel: StaticTranslationString = { de: 'Gruppe', en: 'Group', fr: 'Groupe' };

const membersLabel: Record<'one' | 'other', StaticTranslationString> = {
  one: { de: 'Person', en: 'person', fr: 'personne' },
  other: { de: 'Personen', en: 'people', fr: 'personnes' },
};

const moreMembersLabel: StaticTranslationString = {
  de: 'weitere',
  en: 'more',
  fr: 'de plus',
};

const otherGroupName: StaticTranslationString = { de: 'Weitere', en: 'Other', fr: 'Autres' };

const generalLabel: StaticTranslationString = { de: 'Allgemein', en: 'General', fr: 'Général' };

const everyoneLabel: StaticTranslationString = {
  de: 'Ohne Rolle',
  en: 'No role',
  fr: 'Sans rôle',
};

const everyoneDescription: StaticTranslationString = {
  de: 'jede angemeldete Person',
  en: 'every logged-in person',
  fr: 'toute personne connectée',
};

const operationLabels: Record<AccessOperation, StaticTranslationString> = {
  read: { de: 'Lesen', en: 'Read', fr: 'Lire' },
  create: { de: 'Erstellen', en: 'Create', fr: 'Créer' },
  update: { de: 'Bearbeiten', en: 'Edit', fr: 'Modifier' },
  delete: { de: 'Löschen', en: 'Delete', fr: 'Supprimer' },
};

const conditionalLabel: StaticTranslationString = {
  de: 'nur einzelne Einträge',
  en: 'only some entries',
  fr: 'seulement certaines entrées',
};

const apiOnlyLabel: StaticTranslationString = {
  de: 'nicht in der Seitenleiste, nur über die API',
  en: 'not in the sidebar, API only',
  fr: 'pas dans la barre latérale, API uniquement',
};

const roleLabels: Record<Roles, StaticTranslationString> = {
  [Roles.FullAdmin]: { de: 'Admin', en: 'Admin', fr: 'Admin' },
  [Roles.WebCoreTeam]: { de: 'Web-Kernteam', en: 'Web core team', fr: 'Équipe web' },
  [Roles.TranslationTeam]: {
    de: 'Übersetzungsteam',
    en: 'Translation team',
    fr: 'Équipe de traduction',
  },
  [Roles.ProgramTeam]: { de: 'Programmteam', en: 'Programme team', fr: 'Équipe programme' },
  [Roles.BillingTeam]: { de: 'Rechnungswesen', en: 'Billing', fr: 'Facturation' },
  [Roles.MaterialTeam]: { de: 'Materialteam', en: 'Material team', fr: 'Équipe matériel' },
  [Roles.HofDashboardReviewer]: {
    de: 'Hof-Dashboard-Prüfung',
    en: 'Hof dashboard reviewers',
    fr: 'Vérification du tableau de bord des Hofs',
  },
};

const capabilityLabels: Record<Capability, StaticTranslationString> = {
  adminPanel: {
    de: 'Adminpanel öffnen',
    en: 'Open the admin panel',
    fr: "Ouvrir le panneau d'administration",
  },
  editor: {
    de: 'Entwürfe und Vorschau auf der Website, Exporte',
    en: 'Drafts and preview on the website, exports',
    fr: 'Brouillons et aperçu sur le site, exports',
  },
  materialDepot: {
    de: 'Materialdepot in der App führen',
    en: 'Run the material depot in the app',
    fr: "Gérer le dépôt de matériel dans l'app",
  },
  hofDashboard: {
    de: 'Hof-Dashboard prüfen',
    en: 'Review the Hof dashboard',
    fr: 'Vérifier le tableau de bord des Hofs',
  },
};

const OPERATION_ICONS: Record<AccessOperation, React.FC<{ className?: string }>> = {
  read: EyeIcon,
  create: PlusIcon,
  update: PencilIcon,
  delete: Trash2Icon,
};

const OPERATIONS = Object.keys(OPERATION_ICONS) as AccessOperation[];

const grantedOperations = (access: EntityAccess): AccessOperation[] =>
  OPERATIONS.filter((operation) => (access.operations[operation] ?? 'denied') !== 'denied');

const AccessCell: React.FC<{ access: EntityAccess; locale: Locale }> = ({ access, locale }) => {
  const operations = grantedOperations(access);
  if (operations.length === 0) return <span className="opacity-30">–</span>;

  return (
    <span className="inline-flex items-center gap-1">
      {operations.map((operation) => {
        const status = access.operations[operation];
        const Icon = OPERATION_ICONS[operation];
        const label =
          status === 'conditional'
            ? `${operationLabels[operation][locale]} (${conditionalLabel[locale]})`
            : operationLabels[operation][locale];
        return (
          <span key={operation} title={label} aria-label={label}>
            <Icon className={cn('size-3.5', { 'opacity-40': status === 'conditional' })} />
          </span>
        );
      })}
      {access.hiddenInAdmin && (
        <span title={apiOnlyLabel[locale]} aria-label={apiOnlyLabel[locale]}>
          <CodeXmlIcon className="size-3.5 opacity-40" />
        </span>
      )}
    </span>
  );
};

const CapabilityCell: React.FC<{ granted: boolean }> = ({ granted }) =>
  granted ? <CheckIcon className="size-3.5" /> : <span className="opacity-30">–</span>;

/** The roles of a group as small tags, the way the page marks a group that carries a role. */
const RoleTags: React.FC<{ roles: Roles[]; locale: Locale }> = ({ roles, locale }) => (
  <span className="inline-flex flex-wrap gap-1">
    {roles.map((role) => (
      <span
        key={role}
        title={ROLE_ENVIRONMENT_VARIABLES[role]}
        className="rounded-sm bg-(--theme-elevation-150) px-1.5 py-0.5 text-xs font-medium whitespace-nowrap"
      >
        {roleLabels[role][locale]}
      </span>
    ))}
  </span>
);

interface PageData {
  locale: Locale;
  adminRoute: string;
  hitobitoUrl: string;
  entities: AdminEntity[];
  capabilities: Capability[];
  groups: GroupColumn[];
  everyone: SubjectAccess;
  person: Person;
  isSelf: boolean;
}

const groupName = (group: { groupId: number; name: string | undefined }, locale: Locale): string =>
  group.name ?? `${groupLabel[locale]} ${group.groupId}`;

const personHref = (data: PageData, userId: string): string =>
  `${data.adminRoute}/access-overview?${stringify({
    [ACCESS_OVERVIEW_USER_PARAMETER]: userId,
  })}`;

/**
 * Who is in a group: the count, which opens the names. Each name selects that person, so the
 * page answers "who has this role" and "what may they do" in two clicks.
 */
const GroupMembers: React.FC<{ data: PageData; group: GroupColumn }> = ({ data, group }) => {
  const { locale } = data;
  const count = `${group.memberCount} ${membersLabel[group.memberCount === 1 ? 'one' : 'other'][locale]}`;
  if (group.memberCount === 0) return <span>{count}</span>;
  const unlisted = group.memberCount - group.members.length;
  return (
    <details>
      <summary className="cursor-pointer underline-offset-2 hover:underline">{count}</summary>
      <ul className="m-0 mt-1 flex list-none flex-col gap-0.5 p-0">
        {group.members.map((member) => (
          <li key={member.id}>
            <Link href={personHref(data, member.id)} className="underline-offset-2 hover:underline">
              {member.name}
            </Link>
          </li>
        ))}
        {unlisted > 0 && (
          <li>
            + {unlisted} {moreMembersLabel[locale]}
          </li>
        )}
      </ul>
    </details>
  );
};

/** The groups of the person that hold a role. */
const memberGroups = (data: PageData): GroupColumn[] => {
  const groupIds = new Set(data.person.groups.map((group) => group.id));
  return data.groups.filter((group) => groupIds.has(group.groupId));
};

const sectionsOf = (
  entities: AdminEntity[],
): { area: AdminPanelArea; rows: { entity: AdminEntity; index: number }[] }[] =>
  AREA_ORDER.map((area) => ({
    area,
    rows: entities
      .map((entity, index) => ({ entity, index }))
      .filter(({ entity }) =>
        entity.groupKey === undefined
          ? area === 'backoffice'
          : AdminPanelDashboardGroups[entity.groupKey].area === area,
      ),
  })).filter((section) => section.rows.length > 0);

/** The person picker and, below it, the person's groups, each role group marked with its roles. */
const PersonPanel: React.FC<{ data: PageData; apiRoute: string }> = ({ data, apiRoute }) => {
  const { person, locale } = data;
  const withRole = memberGroups(data);
  const withoutRole = person.groups.length - withRole.length;

  return (
    <div className="mb-6 flex flex-col gap-3">
      <div className="flex max-w-3xl flex-col gap-1">
        <label htmlFor="access-overview-user" className="text-sm font-semibold">
          {personLabel[locale]}
        </label>
        <AccessOverviewUserPicker
          apiRoute={apiRoute}
          selected={{
            id: person.id,
            label: data.isSelf ? `${person.label} (${youLabel[locale]})` : person.label,
          }}
          placeholder={pickerPlaceholder[locale]}
          noResults={pickerNoResults[locale]}
          searchFailed={pickerSearchFailed[locale]}
        />
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold">{groupsLabel[locale]}</span>
        {withRole.length === 0 ? (
          <span className="text-(--theme-elevation-600)">{noRoleGroupsLabel[locale]}</span>
        ) : (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {withRole.map((group) => (
              <li
                key={group.groupId}
                className="flex items-center gap-2 rounded-sm border border-(--theme-success-500) bg-(--theme-success-100) px-2 py-1"
              >
                <a
                  href={`${data.hitobitoUrl}/groups/${group.groupId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {groupName(group, locale)}
                </a>
                <span className="text-xs opacity-60">{group.groupId}</span>
                <RoleTags roles={group.roles} locale={locale} />
              </li>
            ))}
          </ul>
        )}
        {withoutRole > 0 && (
          <span className="text-xs text-(--theme-elevation-600)">
            + {withoutRole} {otherGroupsLabel[locale]}
          </span>
        )}
        {data.person.hofDashboardHoefe.length > 0 && (
          <span className="text-xs text-(--theme-elevation-600)">
            {hofDashboardHoefeLabel[locale]}: {data.person.hofDashboardHoefe.join(', ')}
          </span>
        )}
        <span className="text-xs text-(--theme-elevation-600)">{lastLoginNote[locale]}</span>
      </div>
    </div>
  );
};

/**
 * The matrix: one column for the person, then one per Cevi.DB group that holds a role, then what
 * every logged-in person may do. The person's own groups are tinted, so the columns that explain
 * the person's rights stand right next to them.
 */
const Matrix: React.FC<{ data: PageData }> = ({ data }) => {
  const { locale, person } = data;
  const members = new Set(memberGroups(data).map((group) => group.groupId));
  const columns = data.groups;
  const columnCount = columns.length + 3;

  const columnClass = (group: GroupColumn): string =>
    cn('px-2 py-1', { 'bg-(--theme-success-100)': members.has(group.groupId) });

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 pr-4 text-left align-bottom font-semibold">{groupLabel[locale]}</th>
            <th className="border-x-2 border-t-2 border-(--theme-success-500) px-2 py-2 text-left align-top font-semibold">
              <div>{person.name}</div>
              <div className="text-xs font-normal opacity-70">{personLabel[locale]}</div>
            </th>
            {columns.map((group) => (
              <th key={group.groupId} className={cn(columnClass(group), 'text-left align-top')}>
                <a
                  href={`${data.hitobitoUrl}/groups/${group.groupId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline-offset-2 hover:underline"
                >
                  {groupName(group, locale)}
                </a>
                <div className="mt-1">
                  <RoleTags roles={group.roles} locale={locale} />
                </div>
                <div className="mt-1 text-xs font-normal opacity-70">
                  <div>{group.groupId}</div>
                  <GroupMembers data={data} group={group} />
                </div>
              </th>
            ))}
            <th className="px-2 py-2 text-left align-top font-semibold opacity-70">
              <div>{everyoneLabel[locale]}</div>
              <div className="text-xs font-normal">{everyoneDescription[locale]}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td
              colSpan={columnCount}
              className="pt-4 pb-1 text-xs font-semibold tracking-wide uppercase opacity-60"
            >
              {generalLabel[locale]}
            </td>
          </tr>
          {data.capabilities.map((capability) => (
            <tr key={capability} className="border-t border-current/10">
              <td className="py-1 pr-4">{capabilityLabels[capability][locale]}</td>
              <td className="border-x-2 border-(--theme-success-500) px-2 py-1">
                <CapabilityCell granted={person.access.capabilities[capability]} />
              </td>
              {columns.map((group) => (
                <td key={group.groupId} className={columnClass(group)}>
                  <CapabilityCell granted={group.access.capabilities[capability]} />
                </td>
              ))}
              <td className="px-2 py-1 opacity-70">
                <CapabilityCell granted={data.everyone.capabilities[capability]} />
              </td>
            </tr>
          ))}

          {sectionsOf(data.entities).map((section) => (
            <Fragment key={section.area}>
              <tr>
                <td
                  colSpan={columnCount}
                  className="pt-4 pb-1 text-xs font-semibold tracking-wide uppercase opacity-60"
                >
                  {AdminPanelAreas[section.area][locale]}
                </td>
              </tr>
              {section.rows.map(({ entity, index }) => {
                const personAccess = person.access.entities[index] as EntityAccess;
                const everyoneAccess = data.everyone.entities[index] as EntityAccess;
                return (
                  <tr key={`${entity.type}-${entity.slug}`} className="border-t border-current/10">
                    <td className="py-1 pr-4">
                      <Link
                        href={`${data.adminRoute}/${entity.type}/${entity.slug}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {entity.label}
                      </Link>
                      <span className="ml-2 text-xs opacity-50">
                        {entity.groupKey === undefined
                          ? otherGroupName[locale]
                          : AdminPanelDashboardGroups[entity.groupKey].name[locale]}
                      </span>
                    </td>
                    <td className="border-x-2 border-(--theme-success-500) px-2 py-1">
                      <AccessCell access={personAccess} locale={locale} />
                    </td>
                    {columns.map((group) => (
                      <td key={group.groupId} className={columnClass(group)}>
                        <AccessCell
                          access={group.access.entities[index] as EntityAccess}
                          locale={locale}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1 opacity-70">
                      <AccessCell access={everyoneAccess} locale={locale} />
                    </td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
          <tr>
            <td />
            <td className="border-x-2 border-b-2 border-(--theme-success-500)" />
            <td colSpan={columnCount - 2} />
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const Legend: React.FC<{ locale: Locale }> = ({ locale }) => (
  <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-70">
    {OPERATIONS.map((operation) => {
      const Icon = OPERATION_ICONS[operation];
      return (
        <span key={operation} className="inline-flex items-center gap-1">
          <Icon className="size-3.5" /> {operationLabels[operation][locale]}
        </span>
      );
    })}
    <span className="inline-flex items-center gap-1">
      <EyeIcon className="size-3.5 opacity-40" /> {conditionalLabel[locale]}
    </span>
    <span className="inline-flex items-center gap-1">
      <CodeXmlIcon className="size-3.5 opacity-40" /> {apiOnlyLabel[locale]}
    </span>
  </p>
);

/**
 * Admin view at `/admin/access-overview`: which Cevi.DB group grants which access to every
 * collection and global, and what one person may do and through which of their groups. Every
 * cell is computed by running the real access rules, so the page cannot drift from them. Only
 * full admins may open it; everyone else is sent back to the dashboard.
 */
export default async function AccessOverviewView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps): Promise<React.ReactElement> {
  const { req, permissions, visibleEntities, locale: adminLocale } = initPageResult;
  const { payload, i18n, user } = req;
  const adminRoute = payload.config.routes.admin;

  if (!user || !isFullAdmin({ req })) redirect(adminRoute);
  const locale: Locale = getAdminLocale(i18n);

  const entities = listAdminEntities(payload.config, i18n).filter((entity) => !entity.internal);
  const requestedUser = searchParams?.[ACCESS_OVERVIEW_USER_PARAMETER];
  const requestedUserId = typeof requestedUser === 'string' ? requestedUser : String(user.id);

  const [groups, everyone, requestedPerson] = await Promise.all([
    loadGroupColumns(entities, req),
    loadEveryoneAccess(entities, req),
    loadPerson(requestedUserId, entities, req),
  ]);
  // a link to someone who no longer exists shows the admin's own access instead
  const person = requestedPerson ?? (await loadPerson(String(user.id), entities, req));
  if (person === undefined) redirect(adminRoute);

  const data: PageData = {
    locale,
    adminRoute,
    hitobitoUrl: environmentVariables.HITOBITO_FORWARD_URL,
    entities,
    capabilities: listCapabilities(),
    groups,
    everyone,
    person,
    isSelf: person.id === String(user.id),
  };

  return (
    <DefaultTemplate
      i18n={i18n}
      {...(adminLocale === undefined ? {} : { locale: adminLocale })}
      {...(params === undefined ? {} : { params })}
      payload={payload}
      permissions={permissions}
      {...(searchParams === undefined ? {} : { searchParams })}
      user={user}
      visibleEntities={visibleEntities}
    >
      <SetStepNav nav={[{ label: title[locale] }]} />
      <Gutter className="flex flex-col pt-8 pb-16">
        <h1 className="mb-1 text-3xl font-bold">{title[locale]}</h1>
        <p className="mb-6 max-w-3xl opacity-70">{intro[locale]}</p>
        <PersonPanel data={data} apiRoute={payload.config.routes.api} />
        <Matrix data={data} />
        <Legend locale={locale} />
      </Gutter>
    </DefaultTemplate>
  );
}
