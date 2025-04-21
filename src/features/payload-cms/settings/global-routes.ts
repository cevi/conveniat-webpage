import type { Config } from 'payload';

import type { RoutableConfig } from '@/types/types';

/**
 * Helper function to remove route information from the config.
 * This is necessary to make the extended config compatible with PayloadCMS.
 *
 *
 * TODO: this function should validate that there are not two global pages
 *  with the same URL slug (how to handle different locales?)
 *
 * TODO: validate that page has an SEO tab
 *
 * @param config
 */
export const dropRouteInfo = (config: RoutableConfig): Config => ({
  ...config,
  collections:
    config.collections?.map((collection) => ({
      ...('payloadCollection' in collection ? collection.payloadCollection : collection),
    })) ?? [],
});
