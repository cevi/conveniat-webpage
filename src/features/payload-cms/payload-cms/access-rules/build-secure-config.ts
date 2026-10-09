import {
  canOpenAdminPanel,
  hasAdminOrWebAccess,
  hasEditorialAccess,
  isEditor,
  isFullAdmin,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { stripControlCharactersPlugin } from '@/features/payload-cms/payload-cms/plugins/strip-control-characters-plugin';
import type {
  Access,
  CollectionConfig,
  Config,
  GlobalConfig,
  Plugin,
  SanitizedConfig,
} from 'payload';
import { buildConfig } from 'payload';

type EntityAccess = Record<string, Access>;

const denyAll: Access = () => false;

/**
 * Fills every operation a collection or global leaves undeclared. Payload would fill it with
 * `Boolean(user)`, and a user here is every camp participant who has logged in through Cevi.DB.
 *
 * See https://payloadcms.com/docs/access-control/overview
 */
export const applyDefaultAccess = (config: {
  collections?: Pick<CollectionConfig, 'access'>[];
  globals?: Pick<GlobalConfig, 'access'>[];
}): void => {
  for (const global of config.globals ?? []) {
    global.access = {
      read: hasAdminOrWebAccess,
      update: hasAdminOrWebAccess,
      readVersions: hasAdminOrWebAccess,
      ...global.access,
    };
  }

  for (const collection of config.collections ?? []) {
    collection.access = {
      read: hasEditorialAccess,
      create: hasAdminOrWebAccess,
      update: hasEditorialAccess,
      delete: hasAdminOrWebAccess,
      readVersions: hasAdminOrWebAccess,
      unlock: isFullAdmin,
      ...collection.access,
    };
  }
};

/**
 * Runs after every other plugin, so it also reaches the collections a plugin adds: the forms,
 * the redirects, the search index, the imports and exports, the MCP API keys. Applied to the
 * plain config only, an operation a plugin left out, like `readVersions` on the forms, stayed
 * open to every participant.
 */
const defaultAccessPlugin: Plugin = (config) => {
  applyDefaultAccess(config);
  return config;
};

/**
 * What Payload adds on its own while it sanitizes the config, after the last plugin has run and
 * with `Boolean(user)` on every operation. No option reaches these, so they are narrowed on the
 * sanitized config. Payload's own code writes them through the database adapter or with
 * `overrideAccess`, which these rules do not touch.
 */
const INTERNAL_COLLECTION_ACCESS: Record<string, EntityAccess> = {
  // a lock is written by whoever edits a document, which is anyone working in the admin panel
  'payload-locked-documents': {
    read: canOpenAdminPanel,
    create: canOpenAdminPanel,
    update: canOpenAdminPanel,
    delete: canOpenAdminPanel,
  },
  // the folders of the document library: seen by the editors, arranged by who uploads documents
  'payload-folders': {
    read: isEditor,
    create: hasAdminOrWebAccess,
    update: hasAdminOrWebAccess,
    delete: hasAdminOrWebAccess,
    readVersions: hasAdminOrWebAccess,
  },
  'payload-migrations': { read: denyAll, create: denyAll, update: denyAll, delete: denyAll },
};

const INTERNAL_GLOBAL_ACCESS: Record<string, EntityAccess> = {
  // when each scheduled task last ran; rewriting it stalls a task or runs it on every poll
  'payload-jobs-stats': { read: denyAll, update: denyAll },
};

/** Narrows the collections and globals Payload added by itself, see `INTERNAL_COLLECTION_ACCESS`. */
export const restrictInternalEntities = (config: {
  collections: { slug: string; access: object }[];
  globals: { slug: string; access: object }[];
}): void => {
  for (const collection of config.collections) {
    const access = INTERNAL_COLLECTION_ACCESS[collection.slug];
    if (access !== undefined) Object.assign(collection.access, access);
  }
  for (const global of config.globals) {
    const access = INTERNAL_GLOBAL_ACCESS[global.slug];
    if (access !== undefined) Object.assign(global.access, access);
  }
};

/**
 * Builds a secure config by applying default access rules to all globals and collections.
 * This overrides the default access rules in Payload. This is necessary
 * as we have the unique situation that all users with a CeviDB login can sign in
 * to the page, but they should not be able to access the admin panel or the API.
 *
 * It also registers `stripControlCharactersPlugin`, which strips unrenderable control
 * characters from everything that is saved.
 *
 * This function will also apply the default buildConfig function to the config.
 *
 * @param config the payload configuration to secure
 */
export const buildSecureConfig = async (config: Config): Promise<SanitizedConfig> => {
  // both plugins have to see the collections the other plugins add, so they are registered here
  // instead of walking `config.collections` directly
  config.plugins = [...(config.plugins ?? []), defaultAccessPlugin, stripControlCharactersPlugin];

  const sanitizedConfig = await buildConfig(config);
  restrictInternalEntities(sanitizedConfig);
  return sanitizedConfig;
};
