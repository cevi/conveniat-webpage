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

export type AdminEntityType = 'collections' | 'globals';

export type AccessOperation = 'read' | 'create' | 'update' | 'delete';

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
  const operations = entity.type === 'collections' ? COLLECTION_OPERATIONS : GLOBAL_OPERATIONS;
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
