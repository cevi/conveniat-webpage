import type { Config, SanitizedConfig } from 'payload';
import { buildConfig } from 'payload';
import { canAccessAPI } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';

/**
 * Builds a secure config by applying default access rules to all globals and collections.
 * This overrides the default access rules in Payload. This is necessary
 * as we have the unique situation that all users with a CeviDB login can sign in
 * to the page, but they should not be able to access the admin panel or the API.
 *
 * See https://payloadcms.com/docs/beta/access-control/overview
 *
 * This function will also apply the default buildConfig function to the config.
 *
 * @param config the payload configuration to secure
 */
export const buildSecureConfig = (config: Config): Promise<SanitizedConfig> => {
  // apply default rules to all globals
  if (config.globals)
    for (const global of config.globals) {
      global.access = {
        read: canAccessAPI,
        update: canAccessAPI,
        readVersions: canAccessAPI,
        readDrafts: canAccessAPI,
        ...global.access,
      };
    }

  // apply default rules to all collections
  if (config.collections)
    for (const collection of config.collections) {
      collection.access = {
        read: canAccessAPI,
        create: canAccessAPI,
        update: canAccessAPI,
        delete: canAccessAPI,
        readVersions: canAccessAPI,
        unlock: canAccessAPI,
        ...collection.access,
      };
    }

  return buildConfig(config);
};
