import { CollectionConfig } from 'payload';
import { AdminPanelDashboardGroups } from '@/payload-cms/admin-panel-dashboard-groups';

export const PushNotificationSubscriptions: CollectionConfig = {
  slug: 'push-notification-subscriptions',

  fields: [
    {
      type: 'text',
      name: 'endpoint',
      required: true,
    },

    {
      type: 'number',
      name: 'expirationTime',
      required: false,
    },
    {
      type: 'group',
      name: 'keys',
      fields: [
        {
          type: 'text',
          name: 'p256dh',
          required: true,
        },
        {
          type: 'text',
          name: 'auth',
          required: true,
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
};
