import { beforeSyncWithSearch } from '@/features/payload-cms/payload-cms/plugins/search/before-sync';
import { searchOverrides } from '@/features/payload-cms/payload-cms/plugins/search/search-overrides';
import { searchPlugin } from '@payloadcms/plugin-search';

/**
 * Search Plugin Configuration
 *
 * @see https://payloadcms.com/docs/plugins/search
 *
 */
export const searchPluginConfiguration = searchPlugin({
  collections: ['blog', 'generic-page'],
  defaultPriorities: {
    blog: 2,
    'generic-page': 1, // higher priority for pages,
  },
  searchOverrides: searchOverrides,
  beforeSync: beforeSyncWithSearch,
});
