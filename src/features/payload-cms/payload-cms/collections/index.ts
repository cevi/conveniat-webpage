import { BlogArticleCollection } from '@/features/payload-cms/payload-cms/collections/blog-article';
import { CampMapAnnotationsCollection } from '@/features/payload-cms/payload-cms/collections/camp-map-collection';
import { CampScheduleEntryCollection } from '@/features/payload-cms/payload-cms/collections/camp-schedule-collection';
import { DocumentsCollection } from '@/features/payload-cms/payload-cms/collections/documents-collection';
import { GenericPage as GenericPageCollection } from '@/features/payload-cms/payload-cms/collections/generic-page';
import { ImageCollection } from '@/features/payload-cms/payload-cms/collections/image-collection';
import { PermissionsCollection } from '@/features/payload-cms/payload-cms/collections/permission-collection';
import { PushNotificationSubscriptions } from '@/features/payload-cms/payload-cms/collections/push-notification-subscriptions';
import { TimelineCollection } from '@/features/payload-cms/payload-cms/collections/timeline';
import { TimelineEntryCategory } from '@/features/payload-cms/payload-cms/collections/timeline/timeline-entry-category';
import { UserCollection } from '@/features/payload-cms/payload-cms/collections/user-collection';
import { slugToUrlMapping } from '@/features/payload-cms/slug-to-url-mapping';
import type { RoutableCollectionConfigs } from '@/types/types';
import type { CollectionConfig } from 'payload';

// TODO: add slug validation enforcing uniqueness of slugs

const rawCollectionsConfig: CollectionConfig[] = [
  // routable collections
  BlogArticleCollection,
  GenericPageCollection,
  TimelineCollection,

  // app content collections
  CampMapAnnotationsCollection,
  CampScheduleEntryCollection,

  // general purpose collections, not routable
  ImageCollection,
  DocumentsCollection,
  UserCollection,
  PermissionsCollection,
  PushNotificationSubscriptions,
  TimelineEntryCategory,
];

/**
 * The configuration for the routable collections.
 *
 * This mapping defines the URL prefixes for the collections that should be routable.
 *
 */
export const collectionsConfig: RoutableCollectionConfigs = rawCollectionsConfig.map(
  (collection: CollectionConfig) => {
    const collectionSlug = collection.slug;

    const foundMapping = slugToUrlMapping.find((mapping) => mapping.slug === collectionSlug);

    if (foundMapping === undefined) return collection;
    return {
      urlPrefix: foundMapping.urlPrefix,
      payloadCollection: collection,
    };
  },
);
