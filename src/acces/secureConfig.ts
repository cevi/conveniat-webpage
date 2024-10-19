import { buildConfig, Config } from 'payload'
import { canAccessAPI } from '@/acces/canAccessAdminPanel'

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
export const buildSecureConfig = (config: Config) => {
  // apply default rules to all globals
  config.globals?.forEach((global) => {
    global.access = {
      read: canAccessAPI,
      update: canAccessAPI,
      readVersions: canAccessAPI,
      readDrafts: canAccessAPI,
      ...global.access,
    }
  })

  // apply default rules to all collections
  config.collections?.forEach((collection) => {
    collection.access = {
      read: canAccessAPI,
      create: canAccessAPI,
      update: canAccessAPI,
      delete: canAccessAPI,
      readVersions: canAccessAPI,
      unlock: canAccessAPI,
      ...collection.access,
    }
  })

  return buildConfig(config)
}
