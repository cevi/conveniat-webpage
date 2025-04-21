import type { RoutableCollectionConfigs } from '@/types/types';
import { BlogArticleCollection } from '@/features/payload-cms/payload-cms/collections/blog-article';
import { GenericPage as GenericPageCollection } from '@/features/payload-cms/payload-cms/collections/generic-page';
import { TimelineCollection } from '@/features/payload-cms/payload-cms/collections/timeline';
import { ImageCollection } from '@/features/payload-cms/payload-cms/collections/image-collection';
import { DocumentsCollection } from '@/features/payload-cms/payload-cms/collections/documents-collection';
import { UserCollection } from '@/features/payload-cms/payload-cms/collections/user-collection';
import { PermissionsCollection } from '@/features/payload-cms/payload-cms/collections/permission-collection';
import { PushNotificationSubscriptions } from '@/features/payload-cms/payload-cms/collections/push-notification-subscriptions';

// TODO: based on the definition here, pattern for invalid URLs slugs should be generated
//   and used in the slug validation. E.g. is should be forbidden to create a slug in the
//   generic page collection starting with /blog/*** or /zeitstrahl/***.
// TODO: add slug validation enforcing uniqueness of slugs
// TODO: add option to disable unpublishing of a page

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
    urlPrefix: { de: 'zeitstrahl', en: 'timeline', fr: 'chronologie' },
    payloadCollection: TimelineCollection,
  },

  // general purpose collections, not routable
  ImageCollection,
  DocumentsCollection,
  UserCollection,
  PermissionsCollection,
  PushNotificationSubscriptions,
];
