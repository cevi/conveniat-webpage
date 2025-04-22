import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';
import { asPushNotificationCollection } from '../utils/push-notification-collection';

export const PushNotificationSubscriptions: CollectionConfig = asPushNotificationCollection({
  slug: 'push-notification-subscriptions',

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

  labels: {
    singular: 'Push Notification Subscription',
    plural: 'Push Notification Subscriptions',
  },

  // hidden from the admin panel
  admin: {
    group: AdminPanelDashboardGroups.InternalCollections,
  },
});
