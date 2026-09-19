import {
  hasAccessToThisHelper,
  hasAdminOrWebAccess,
  Roles,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { stripControlCharactersFromData } from '@/features/payload-cms/payload-cms/hooks/strip-control-characters';
import type { Config, SanitizedConfig } from 'payload';
import { buildConfig } from 'payload';

/**
 * Builds a secure config by applying default access rules to all globals and collections.
 * This overrides the default access rules in Payload. This is necessary
 * as we have the unique situation that all users with a CeviDB login can sign in
 * to the page, but they should not be able to access the admin panel or the API.
 *
 * See https://payloadcms.com/docs/access-control/overview
 *
 * It also strips unrenderable control characters from everything that is saved, see
 * `stripControlCharactersFromData`.
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
        read: hasAdminOrWebAccess,
        update: hasAdminOrWebAccess,
        readVersions: hasAdminOrWebAccess,
        ...global.access,
      };

      global.hooks = {
        ...global.hooks,
        beforeChange: [stripControlCharactersFromData, ...(global.hooks?.beforeChange ?? [])],
      };
    }

  // apply default rules to all collections
  if (config.collections)
    for (const collection of config.collections) {
      collection.access = {
        read: hasAccessToThisHelper({
          requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam, Roles.TranslationTeam],
        }),
        create: hasAdminOrWebAccess,
        update: hasAccessToThisHelper({
          requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam, Roles.TranslationTeam],
        }),
        delete: hasAdminOrWebAccess,
        readVersions: hasAdminOrWebAccess,
        unlock: hasAccessToThisHelper({ requiredRoles: [Roles.FullAdmin] }),
        ...collection.access,
      };

      collection.hooks = {
        ...collection.hooks,
        beforeChange: [stripControlCharactersFromData, ...(collection.hooks?.beforeChange ?? [])],
      };
    }

  return buildConfig(config);
};
