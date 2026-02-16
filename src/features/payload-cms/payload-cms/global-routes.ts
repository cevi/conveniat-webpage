import type { Config } from 'payload';

import type { RoutableConfig } from '@/types/types';

/**
 * Helper function to remove route information from the config.
 * This is necessary to make the extended config compatible with PayloadCMS.
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
