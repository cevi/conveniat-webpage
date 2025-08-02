import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { asPushNotificationCollection } from '@/features/payload-cms/payload-cms/utils/push-notification-collection';
import type { CollectionConfig } from 'payload';

export const PushNotificationSubscriptions: CollectionConfig = asPushNotificationCollection({
  slug: 'push-notification-subscriptions',

  labels: {
    singular: {
      en: 'Push Notification Subscription',
      de: 'Abonnement für Push-Benachrichtigungen',
      fr: 'Abonnement de notification push',
    },
    plural: {
      en: 'Push Notification Subscriptions',
      de: 'Abonnements für Push-Benachrichtigungen',
      fr: 'Abonnements de notification push',
    },
  },

  fields: [
    {
      name: 'user',
      relationTo: 'users',
      type: 'relationship',
    },
    {
      type: 'text',
      name: 'endpoint',
      required: true,
      admin: {
        readOnly: true,
      },
    },

    {
      type: 'number',
      name: 'expirationTime',
      required: false,
      admin: {
        readOnly: true,
      },
    },
    {
      type: 'group',
      name: 'keys',
      fields: [
        {
          type: 'text',
          name: 'p256dh',
          required: true,
          admin: {
            readOnly: true,
          },
        },
        {
          type: 'text',
          name: 'auth',
          required: true,
          admin: {
            readOnly: true,
          },
        },
      ],
    },
  ],

  // hidden from the admin panel
  admin: {
    group: AdminPanelDashboardGroups.GlobalSettings,
    groupBy: false,
    /** this is broken with our localized versions */
    disableCopyToLocale: true,
  },
  access: {
    read: canAccessAdminPanel,
    create: () => false, // disable creating subscriptions
    update: () => false, // disable update for subscriptions
    delete: () => true, // disable delete for subscriptions
  },
});
