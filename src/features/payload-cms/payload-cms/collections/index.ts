import { BlogArticleCollection } from '@/features/payload-cms/payload-cms/collections/blog-article';
import { DocumentsCollection } from '@/features/payload-cms/payload-cms/collections/documents-collection';
import { GenericPage as GenericPageCollection } from '@/features/payload-cms/payload-cms/collections/generic-page';
import { ImageCollection } from '@/features/payload-cms/payload-cms/collections/image-collection';
import { PermissionsCollection } from '@/features/payload-cms/payload-cms/collections/permission-collection';
import { PushNotificationSubscriptions } from '@/features/payload-cms/payload-cms/collections/push-notification-subscriptions';
import { TimelineCollection } from '@/features/payload-cms/payload-cms/collections/timeline';
import { TimelineEntryCategory } from '@/features/payload-cms/payload-cms/collections/timeline/timeline-entry-category';
import { UserCollection } from '@/features/payload-cms/payload-cms/collections/user-collection';
import type { RoutableCollectionConfigs } from '@/types/types';

// TODO: add slug validation enforcing uniqueness of slugs

/**
 * The configuration for the routable collections.
 *
 * This mapping defines the URL prefixes for the collections that should be routable.
 *
 */
export const collectionsConfig: RoutableCollectionConfigs = [
  // routable collections
  {
    urlPrefix: { de: 'blog', en: 'blog', fr: 'blog' },
    payloadCollection: BlogArticleCollection,
  },
  {
    urlPrefix: { de: '', en: '', fr: '' },
    payloadCollection: GenericPageCollection,
  },
  {
    urlPrefix: { de: 'timeline-preview', en: 'timeline-preview', fr: 'timeline-preview' },
    payloadCollection: TimelineCollection,
  },

  // general purpose collections, not routable
  ImageCollection,
  DocumentsCollection,
  UserCollection,
  PermissionsCollection,
  PushNotificationSubscriptions,
  TimelineEntryCategory,
];
