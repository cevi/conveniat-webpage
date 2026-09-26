import { BillParticipantsCollection } from '@/features/billing/collections/bill-participants';
import { BillPdfsCollection } from '@/features/billing/collections/bill-pdfs-collection';
import { AnnouncementChannelsCollection } from '@/features/payload-cms/payload-cms/collections/announcement-channels';
import { AnnouncementsCollection } from '@/features/payload-cms/payload-cms/collections/announcements';
import { BlogArticleCollection } from '@/features/payload-cms/payload-cms/collections/blog-article';
import { CampCategoryCollection } from '@/features/payload-cms/payload-cms/collections/camp-category';
import { CampMapAnnotationsCollection } from '@/features/payload-cms/payload-cms/collections/camp-map-collection';
import { CampScheduleEntryCollection } from '@/features/payload-cms/payload-cms/collections/camp-schedule-entry-collection';
import { ChatImagesCollection } from '@/features/payload-cms/payload-cms/collections/chat-images-collection';
import { DocumentsCollection } from '@/features/payload-cms/payload-cms/collections/documents-collection';
import { EmergencyCardsCollection } from '@/features/payload-cms/payload-cms/collections/emergency-cards';
import { FormCollection } from '@/features/payload-cms/payload-cms/collections/form-collection';
import { GenericPage as GenericPageCollection } from '@/features/payload-cms/payload-cms/collections/generic-page';
import { JobCollection } from '@/features/payload-cms/payload-cms/collections/helper-job-collection';
import { HelperShiftsCollection } from '@/features/payload-cms/payload-cms/collections/helper-shifts-collection';
import { HoefeCollection } from '@/features/payload-cms/payload-cms/collections/hoefe-collection';
import { ImageCollection } from '@/features/payload-cms/payload-cms/collections/image-collection';
import { OutgoingEmails } from '@/features/payload-cms/payload-cms/collections/outgoing-emails';
import { PayloadWorkersCollection } from '@/features/payload-cms/payload-cms/collections/payload-workers';
import { PermissionsCollection } from '@/features/payload-cms/payload-cms/collections/permission-collection';
import { PhotoContestCollection } from '@/features/payload-cms/payload-cms/collections/photo-contest-collection';
import { PiketScheduleCollection } from '@/features/payload-cms/payload-cms/collections/piket-schedule-collection';
import { PushNotificationSubscriptions } from '@/features/payload-cms/payload-cms/collections/push-notification-subscriptions';
import { SmtpBounceMailTracking } from '@/features/payload-cms/payload-cms/collections/smtp-bounce-tracking';
import { TimelineCollection } from '@/features/payload-cms/payload-cms/collections/timeline';
import { TimelineEntryCategory } from '@/features/payload-cms/payload-cms/collections/timeline/timeline-entry-category';
import { UserCollection } from '@/features/payload-cms/payload-cms/collections/user-collection';
import { UserSubmittedImagesCollection } from '@/features/payload-cms/payload-cms/collections/user-submitted-images-collection';
import { asInstrumentalCollection } from '@/features/payload-cms/payload-cms/utils/instrumentalized-collection';
import { slugToUrlMapping } from '@/features/payload-cms/slug-to-url-mapping';
import { PresenceLogCollection } from '@/features/presence/payload-cms/collections/presence-log-collection';
import { BlockedJobs } from '@/features/registration_process/collections/blocked-jobs';
import type { RoutableCollectionConfigs } from '@/types/types';
import type { CollectionConfig } from 'payload';

// TODO: add slug validation enforcing uniqueness of slugs

/**
 * The order of this list is the order of the admin sidebar, see
 * `admin-panel-dashboard-groups.ts`. Keep the collections of one area together.
 */
const rawCollectionsConfig: CollectionConfig[] = [
  // Webseite
  GenericPageCollection,
  BlogArticleCollection,
  TimelineCollection,
  TimelineEntryCategory,
  ImageCollection,
  UserSubmittedImagesCollection,
  DocumentsCollection,
  PermissionsCollection,
  FormCollection,
  JobCollection,
  BlockedJobs,

  // App
  AnnouncementChannelsCollection,
  AnnouncementsCollection,
  EmergencyCardsCollection,
  PhotoContestCollection,
  CampMapAnnotationsCollection,
  CampCategoryCollection,
  CampScheduleEntryCollection,
  HelperShiftsCollection,
  PiketScheduleCollection,
  PushNotificationSubscriptions,

  // Backoffice
  UserCollection,
  PresenceLogCollection,
  BillParticipantsCollection,
  BillPdfsCollection,
  HoefeCollection,
  OutgoingEmails,
  PayloadWorkersCollection,

  // internal, never shown in the admin panel
  ChatImagesCollection,
  SmtpBounceMailTracking,
];

/**
 * The configuration for the routable collections.
 *
 * This mapping defines the URL prefixes for the collections that should be routable.
 *
 * */
export const collectionsConfig: RoutableCollectionConfigs = rawCollectionsConfig.map(
  (collectionConfig: CollectionConfig) => {
    const collectionWithInstrumentation = asInstrumentalCollection(collectionConfig);
    const collectionSlug = collectionWithInstrumentation.slug;

    const foundMapping = slugToUrlMapping.find((mapping) => mapping.slug === collectionSlug);

    if (foundMapping === undefined) return collectionWithInstrumentation;
    return {
      urlPrefix: foundMapping.urlPrefix,
      payloadCollection: collectionWithInstrumentation,
    };
  },
);
