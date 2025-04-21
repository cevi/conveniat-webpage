import { searchPlugin } from '@payloadcms/plugin-search';
import { searchOverrides } from '@/features/payload-cms/settings/plugins/search/search-overrides';
import { beforeSyncWithSearch } from '@/features/payload-cms/settings/plugins/search/before-sync';

/**
 * Search Plugin Configuration
 *
 * @see https://payloadcms.com/docs/plugins/search
 *
 */
export const searchPluginConfiguration = searchPlugin({
  collections: ['blog'],
  defaultPriorities: {
    blog: 1,
  },
  searchOverrides: searchOverrides,
  beforeSync: beforeSyncWithSearch,
});
