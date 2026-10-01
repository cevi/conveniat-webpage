import type { AdminPanelDashboardGroupKey } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { Locale } from '@/types/types';
import type {
  LabelFunction,
  PayloadRequest,
  SanitizedCollectionConfig,
  SanitizedGlobalConfig,
  StaticLabel,
} from 'payload';

/** The search parameter of the access overview that names the person it explains. */
export const ACCESS_OVERVIEW_USER_PARAMETER = 'user';

export type AdminEntityType = 'collections' | 'globals';

export type AccessOperation = 'read' | 'create' | 'update' | 'delete' | 'readVersions';

/** `conditional` means the rule returned a query, so only some documents are accessible. */
export type AccessStatus = 'granted' | 'conditional' | 'denied';

export interface AdminEntity {
  type: AdminEntityType;
  slug: string;
  label: string;
  groupKey: AdminPanelDashboardGroupKey | undefined;
  /** `true` when `admin.hidden` is the literal `true`, i.e. never shown to anyone. */
  internal: boolean;
  config: SanitizedCollectionConfig | SanitizedGlobalConfig;
}

export const COLLECTION_OPERATIONS: AccessOperation[] = ['read', 'create', 'update', 'delete'];
export const GLOBAL_OPERATIONS: AccessOperation[] = ['read', 'update'];

type I18n = PayloadRequest['i18n'];

/**
 * The admin panel language, narrowed to one of our locales. Payload's `i18n.language` follows
 * the language switcher in the admin panel, which is what the sidebar labels use as well.
 */
export const getAdminLocale = (i18n: Pick<I18n, 'language'>): Locale => {
  const language = i18n.language;
  if (language === 'en' || language === 'fr') return language;
  return 'de';
};

const translateLabel = (label: LabelFunction | StaticLabel | undefined, i18n: I18n): string => {
  if (label === undefined) return '';
  if (typeof label === 'function') return label({ i18n, t: i18n.t });
  if (typeof label === 'string') return label;
  return label[i18n.language] ?? label['de'] ?? Object.values(label)[0] ?? '';
};

/**
 * Finds the dashboard group of an entity by comparing the German sidebar label. The sanitized
 * config keeps the label object we passed to `admin.group`, but plugins may copy it, so the
 * comparison is by value.
 */
export const resolveGroupKey = (
  group: SanitizedCollectionConfig['admin']['group'],
): AdminPanelDashboardGroupKey | undefined => {
  if (typeof group !== 'object') return undefined;
  const germanLabel = (group as Record<string, string | undefined>)['de'];
  const entry = Object.entries(AdminPanelDashboardGroups).find(
    ([, definition]) => definition.label.de === germanLabel,
  );
  return entry?.[0] as AdminPanelDashboardGroupKey | undefined;
};

/**
 * Evaluates `admin.hidden` for a user the same way Payload does for the sidebar.
 */
export const isHiddenInAdmin = (
  entity: Pick<AdminEntity, 'config'>,
  user: PayloadRequest['user'],
): boolean => {
  const { hidden } = entity.config.admin;
  if (typeof hidden !== 'function') return hidden === true;
  if (!user) return true;
  try {
    return hidden({ user });
  } catch {
    return true;
  }
};

/**
 * All collections and globals in config order, which is the sidebar order.
 */
export const listAdminEntities = (
  config: PayloadRequest['payload']['config'],
  i18n: I18n,
): AdminEntity[] => {
  const collections: AdminEntity[] = config.collections.map((collection) => ({
    type: 'collections',
    slug: collection.slug,
    label: translateLabel(collection.labels.plural, i18n),
    groupKey: resolveGroupKey(collection.admin.group),
    internal: collection.admin.hidden === true,
    config: collection,
  }));
  const globals: AdminEntity[] = config.globals.map((global) => ({
    type: 'globals',
    slug: global.slug,
    label: translateLabel(global.label, i18n),
    groupKey: resolveGroupKey(global.admin.group),
    internal: global.admin.hidden === true,
    config: global,
  }));
  return [...collections, ...globals];
};

/**
 * Maps the return value of a Payload access function to a status.
 */
export const toAccessStatus = (result: unknown): AccessStatus => {
  if (result === true) return 'granted';
  if (typeof result === 'object' && result !== null) return 'conditional';
  return 'denied';
};

/**
 * Runs the access rules of one entity for the user on `request`. A rule that throws counts as
 * denied, which is also how Payload treats it.
 */
export const evaluateEntityAccess = async (
  entity: Pick<AdminEntity, 'type' | 'slug' | 'config'>,
  request: PayloadRequest,
): Promise<Partial<Record<AccessOperation, AccessStatus>>> => {
  const operations = [
    ...(entity.type === 'collections' ? COLLECTION_OPERATIONS : GLOBAL_OPERATIONS),
    // old versions hold everything a document ever contained, drafts included, and have a rule
    // of their own that is easy to leave out
    ...(entity.config.versions ? (['readVersions'] as const) : []),
  ];
  const access = entity.config.access as Partial<
    Record<AccessOperation, (args: { req: PayloadRequest }) => unknown>
  >;

  const entries = await Promise.all(
    operations.map(async (operation): Promise<[AccessOperation, AccessStatus]> => {
      const rule = access[operation];
      if (rule === undefined) return [operation, 'denied'];
      try {
        return [operation, toAccessStatus(await rule({ req: request }))];
      } catch (error) {
        request.payload.logger.debug(
          { err: error, slug: entity.slug, operation },
          'Access rule threw while building the access overview',
        );
        return [operation, 'denied'];
      }
    }),
  );

  return Object.fromEntries(entries);
};

/** What a subject of the access overview, a Cevi.DB group or a person, may do with one entity. */
export interface EntityAccess {
  operations: Partial<Record<AccessOperation, AccessStatus>>;
  /** Readable, but kept out of the sidebar, so reachable over the API only. */
  hiddenInAdmin: boolean;
}

const ACCESS_RANK: Record<AccessStatus, number> = { denied: 0, conditional: 1, granted: 2 };

const rankOf = (access: EntityAccess, operation: AccessOperation): number =>
  ACCESS_RANK[access.operations[operation] ?? 'denied'];

/**
 * The groups that explain a right of a person: those of the person's groups that grant more of
 * the operation than every logged-in person has anyway. A public read is "granted" by every
 * group and explains nothing; a group that turns "only some entries" into all of them does.
 */
export const findGrantingGroupIds = (
  operation: AccessOperation,
  groups: readonly { groupId: number; access: EntityAccess }[],
  everyone: EntityAccess,
): number[] =>
  groups
    .filter(({ access }) => rankOf(access, operation) > rankOf(everyone, operation))
    .map(({ groupId }) => groupId);

/**
 * Whether a person holds nothing on an entity beyond what every logged-in person has: such an
 * entry says nothing about the person and is listed apart.
 */
export const isOpenToEveryone = (person: EntityAccess, everyone: EntityAccess): boolean =>
  (Object.keys(person.operations) as AccessOperation[]).every(
    (operation) => rankOf(person, operation) <= rankOf(everyone, operation),
  );
