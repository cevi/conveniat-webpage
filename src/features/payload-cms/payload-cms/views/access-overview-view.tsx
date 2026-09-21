import { environmentVariables } from '@/config/environment-variables';
import { isFullAdmin, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { AdminPanelArea } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import {
  AdminPanelAreas,
  AdminPanelDashboardGroups,
} from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type {
  AccessOperation,
  AccessStatus,
  AdminEntity,
  LoginBaseline,
} from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import {
  evaluateEntityAccess,
  getAdminLocale,
  isHiddenInAdmin,
  listAdminEntities,
  resolveLoginBaseline,
} from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter, SetStepNav } from '@payloadcms/ui';
import { CodeXmlIcon, EyeIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { AdminViewServerProps, PayloadRequest, TypedUser } from 'payload';
import { createLocalReq } from 'payload';
import type React from 'react';
import { Fragment } from 'react';

const AREA_ORDER: AdminPanelArea[] = ['webpage', 'app', 'backoffice'];

const title: StaticTranslationString = {
  de: 'Zugriff nach Cevi.DB-Gruppe',
  en: 'Access by Cevi.DB group',
  fr: 'Accès par groupe Cevi.DB',
};

const intro: StaticTranslationString = {
  de: 'Wer im Adminpanel was darf, ergibt sich aus der Mitgliedschaft in diesen Cevi.DB-Gruppen. Eine Person mit mehreren Gruppen erhält die Rechte aller ihrer Gruppen.',
  en: 'What someone may do in the admin panel follows from membership in these Cevi.DB groups. A person in several groups gets the rights of all of them.',
  fr: "Ce que chacun peut faire dans le panneau d'administration découle de l'appartenance à ces groupes Cevi.DB. Une personne dans plusieurs groupes cumule leurs droits.",
};

const loginGroupsLabel: StaticTranslationString = {
  de: 'Anmeldung am Adminpanel',
  en: 'Admin panel login',
  fr: "Connexion au panneau d'administration",
};

const yourGroupsLabel: StaticTranslationString = {
  de: 'Deine Gruppen',
  en: 'Your groups',
  fr: 'Tes groupes',
};

const noGroupsLabel: StaticTranslationString = {
  de: 'Keine Gruppen bekannt.',
  en: 'No groups known.',
  fr: 'Aucun groupe connu.',
};

const groupLabel: StaticTranslationString = { de: 'Gruppe', en: 'Group', fr: 'Groupe' };

const otherGroupName: StaticTranslationString = { de: 'Weitere', en: 'Other', fr: 'Autres' };

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

const addOnLabel: StaticTranslationString = {
  de: 'Zusatzgruppe, erlaubt allein keine Anmeldung',
  en: 'add-on group, no login on its own',
  fr: 'groupe complémentaire, pas de connexion seul',
};

const shownWithLabel: StaticTranslationString = {
  de: 'gezeigt mit',
  en: 'shown with',
  fr: 'affiché avec',
};

const addOnExplanation: StaticTranslationString = {
  de: 'Eine Zusatzgruppe steht nicht in der Liste der Anmeldegruppen. Ihre Spalte zeigt deshalb, was sie zusätzlich zu einer Anmeldung am Adminpanel erlaubt.',
  en: 'An add-on group is not one of the login groups. Its column therefore shows what it allows on top of an admin panel login.',
  fr: "Un groupe complémentaire ne figure pas parmi les groupes de connexion. Sa colonne montre donc ce qu'il autorise en plus d'une connexion au panneau d'administration.",
};

const roleLabels: Record<Roles | 'billing', StaticTranslationString> = {
  [Roles.FullAdmin]: { de: 'Admin', en: 'Admin', fr: 'Admin' },
  [Roles.WebCoreTeam]: { de: 'Web-Kernteam', en: 'Web core team', fr: 'Équipe web' },
  [Roles.TranslationTeam]: {
    de: 'Übersetzungsteam',
    en: 'Translation team',
    fr: 'Équipe de traduction',
  },
  [Roles.ProgramTeam]: { de: 'Programmteam', en: 'Programme team', fr: 'Équipe programme' },
  billing: { de: 'Rechnungswesen', en: 'Billing', fr: 'Facturation' },
};

interface ConfiguredColumn {
  key: Roles | 'billing';
  /** The environment variable that lists the group ids, so admins know where to change it. */
  envName: string;
  groupIds: number[];
}

type RoleColumn = ConfiguredColumn & LoginBaseline<ConfiguredColumn>;

/**
 * One column per role, in the order of `roles.ts`, followed by the add-on groups. Roles without
 * a configured group are skipped.
 *
 * A column whose groups are all missing from `GROUPS_WITH_API_ACCESS` cannot log in, and rules
 * that require a login on top of the group — `canAccessBilling` is the one we have — would deny
 * every operation for it. Such a column is an add-on and carries a login baseline, so its cells
 * show what the group adds rather than a column of dashes. See `resolveLoginBaseline`.
 */
const listRoleColumns = (): RoleColumn[] => {
  const billingGroupId = environmentVariables.BILLING_ADMIN_GROUP_ID;
  const configured: ConfiguredColumn[] = [
    {
      key: Roles.FullAdmin,
      envName: 'CEVIDB_GROUP_FULL_ADMIN',
      groupIds: environmentVariables.CEVIDB_GROUP_FULL_ADMIN,
    },
    {
      key: Roles.WebCoreTeam,
      envName: 'CEVIDB_GROUP_WEB_CORE_TEAM',
      groupIds: environmentVariables.CEVIDB_GROUP_WEB_CORE_TEAM,
    },
    {
      key: Roles.TranslationTeam,
      envName: 'CEVIDB_GROUP_TRANSLATION_TEAM',
      groupIds: environmentVariables.CEVIDB_GROUP_TRANSLATION_TEAM,
    },
    {
      key: Roles.ProgramTeam,
      envName: 'CEVIDB_GROUP_PROGRAM_TEAM',
      groupIds: environmentVariables.CEVIDB_GROUP_PROGRAM_TEAM,
    },
    {
      key: 'billing',
      envName: 'BILLING_ADMIN_GROUP_ID',
      groupIds: billingGroupId === undefined ? [] : [Number(billingGroupId)],
    },
  ];
  const columns = configured.filter((column) => column.groupIds.length > 0);

  return resolveLoginBaseline(columns, environmentVariables.GROUPS_WITH_API_ACCESS);
};

interface RoleAccess {
  operations: Partial<Record<AccessOperation, AccessStatus>>;
  hiddenInAdmin: boolean;
}

interface EntityRow {
  entity: AdminEntity;
  byRole: RoleAccess[];
}

/**
 * Evaluates the access rules with a stand-in user that holds the groups of one column, plus the
 * baseline login groups for an add-on column. Access rules only look at `req.user.groups`, so
 * that membership is the whole role.
 */
const evaluateRole = async (
  role: RoleColumn,
  entities: AdminEntity[],
  request: PayloadRequest,
): Promise<RoleAccess[]> => {
  const standInUser = {
    id: `role-preview-${role.key}`,
    collection: request.payload.config.admin.user,
    groups: [...role.groupIds, ...role.baselineGroupIds].map((id) => ({
      id,
      name: roleLabels[role.key].de,
    })),
  } as unknown as TypedUser;

  const roleRequest = await createLocalReq(
    { user: standInUser, req: { i18n: request.i18n } },
    request.payload,
  );

  return Promise.all(
    entities.map(async (entity) => ({
      operations: await evaluateEntityAccess(entity, roleRequest),
      hiddenInAdmin: isHiddenInAdmin(entity, standInUser),
    })),
  );
};

const groupIdsOf = (user: PayloadRequest['user']): Set<number> => {
  if (!user || !('groups' in user) || !Array.isArray(user.groups)) return new Set();
  return new Set(user.groups.map((group: { id: number }) => group.id));
};

const OPERATION_ICONS: Record<AccessOperation, React.FC<{ className?: string }>> = {
  read: EyeIcon,
  create: PlusIcon,
  update: PencilIcon,
  delete: Trash2Icon,
};

const AccessCell: React.FC<{ access: RoleAccess; locale: Locale }> = ({ access, locale }) => {
  const operations = (Object.keys(OPERATION_ICONS) as AccessOperation[]).filter((operation) => {
    const status = access.operations[operation];
    return status !== undefined && status !== 'denied';
  });
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

/**
 * Admin view at `/admin/access-overview` that shows which Cevi.DB group grants which access to
 * every collection and global. The matrix is computed from the real access rules, so it cannot
 * drift from them. Only full admins may open it; everyone else is sent back to the dashboard.
 */
export default async function AccessOverviewView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps): Promise<React.ReactElement> {
  const { req, permissions, visibleEntities, locale: adminLocale } = initPageResult;
  const { payload, i18n, user } = req;
  const adminRoute = payload.config.routes.admin;

  if (!isFullAdmin({ req })) redirect(adminRoute);
  const locale: Locale = getAdminLocale(i18n);
  const hitobitoUrl = environmentVariables.HITOBITO_FORWARD_URL;

  const roles = listRoleColumns();
  const entities = listAdminEntities(payload.config, i18n).filter((entity) => !entity.internal);
  const accessByRole = await Promise.all(roles.map((role) => evaluateRole(role, entities, req)));
  const rows: EntityRow[] = entities.map((entity, index) => ({
    entity,
    byRole: accessByRole.map((roleAccess) => roleAccess[index] as RoleAccess),
  }));

  const userGroupIds = groupIdsOf(user);
  const userGroups =
    user && 'groups' in user && Array.isArray(user.groups)
      ? (user.groups as { id: number; name?: string | null }[])
      : [];

  const sections = AREA_ORDER.map((area) => ({
    area,
    rows: rows.filter((row) =>
      row.entity.groupKey === undefined
        ? area === 'backoffice'
        : AdminPanelDashboardGroups[row.entity.groupKey].area === area,
    ),
  })).filter((section) => section.rows.length > 0);

  return (
    <DefaultTemplate
      i18n={i18n}
      {...(adminLocale === undefined ? {} : { locale: adminLocale })}
      {...(params === undefined ? {} : { params })}
      payload={payload}
      permissions={permissions}
      {...(searchParams === undefined ? {} : { searchParams })}
      {...(user ? { user } : {})}
      visibleEntities={visibleEntities}
    >
      <SetStepNav nav={[{ label: title[locale] }]} />
      <Gutter className="flex flex-col pt-8 pb-16">
        <h1 className="mb-1 text-3xl font-bold">{title[locale]}</h1>
        <p className="mb-6 max-w-3xl opacity-70">{intro[locale]}</p>

        <dl className="mb-4 grid gap-x-6 gap-y-1 text-sm md:grid-cols-[auto_1fr]">
          <dt className="font-semibold">{loginGroupsLabel[locale]}</dt>
          <dd>{environmentVariables.GROUPS_WITH_API_ACCESS.join(', ')}</dd>
          <dt className="font-semibold">{yourGroupsLabel[locale]}</dt>
          <dd>
            {userGroups.length === 0
              ? noGroupsLabel[locale]
              : userGroups
                  .map((group) => `${group.name ?? groupLabel[locale]} (${group.id})`)
                  .join(', ')}
          </dd>
        </dl>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-4 text-left font-semibold">{groupLabel[locale]}</th>
                {roles.map((role) => {
                  const isMember = role.groupIds.some((id) => userGroupIds.has(id));
                  return (
                    <th
                      key={role.key}
                      className={cn('px-2 py-2 text-left align-top font-semibold', {
                        'bg-green-900/10 dark:bg-green-900/30': isMember,
                      })}
                      title={role.envName}
                    >
                      <div>{roleLabels[role.key][locale]}</div>
                      <div className="text-xs font-normal opacity-70">
                        {role.groupIds.map((id, index) => (
                          <span key={id}>
                            {index > 0 && ', '}
                            <a
                              href={`${hitobitoUrl}/groups/${id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="underline-offset-2 hover:underline"
                            >
                              {id}
                            </a>
                          </span>
                        ))}
                      </div>
                      {role.isAddOn && (
                        <div
                          className="text-xs font-normal opacity-70"
                          title={addOnExplanation[locale]}
                        >
                          {addOnLabel[locale]}
                          {role.borrowedFrom !== undefined &&
                            `, ${shownWithLabel[locale]} ${roleLabels[role.borrowedFrom.key][locale]}`}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <Fragment key={section.area}>
                  <tr>
                    <td
                      colSpan={roles.length + 1}
                      className="pt-4 pb-1 text-xs font-semibold tracking-wide uppercase opacity-60"
                    >
                      {AdminPanelAreas[section.area][locale]}
                    </td>
                  </tr>
                  {section.rows.map((row) => (
                    <tr
                      key={`${row.entity.type}-${row.entity.slug}`}
                      className="border-t border-current/10"
                    >
                      <td className="py-1 pr-4">
                        <Link
                          href={`${adminRoute}/${row.entity.type}/${row.entity.slug}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {row.entity.label}
                        </Link>
                        <span className="ml-2 text-xs opacity-50">
                          {row.entity.groupKey === undefined
                            ? otherGroupName[locale]
                            : AdminPanelDashboardGroups[row.entity.groupKey].name[locale]}
                        </span>
                      </td>
                      {row.byRole.map((access, index) => (
                        <td key={roles[index]?.key} className="px-2 py-1">
                          <AccessCell access={access} locale={locale} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-70">
          {(Object.keys(OPERATION_ICONS) as AccessOperation[]).map((operation) => {
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
        {roles.some((role) => role.isAddOn) && (
          <p className="mt-2 max-w-3xl text-xs opacity-70">{addOnExplanation[locale]}</p>
        )}
      </Gutter>
    </DefaultTemplate>
  );
}
