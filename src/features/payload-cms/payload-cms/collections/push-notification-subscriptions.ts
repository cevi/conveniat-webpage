import {
  hasAccessToThisHelper,
  Roles,
  shouldHideInAdminPanelIfNotAdmin,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
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
      type: 'select',
      name: 'platform',
      required: true,
      defaultValue: 'web',
      options: [
        { label: 'Web', value: 'web' },
        { label: 'iOS', value: 'ios' },
        { label: 'Android', value: 'android' },
      ],
      admin: {
        readOnly: true,
      },
    },
    {
      type: 'text',
      name: 'token',
      unique: true,
      required: false,
      admin: {
        readOnly: true,
      },
    },
    {
      type: 'text',
      name: 'endpoint',
      required: false,
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
          required: false,
          admin: {
            readOnly: true,
          },
        },
        {
          type: 'text',
          name: 'auth',
          required: false,
          admin: {
            readOnly: true,
          },
        },
      ],
    },
    {
      type: 'text',
      name: 'userAgent',
      required: false,
      admin: {
        readOnly: true,
      },
    },
    /**
     * Native shell version this device last registered with, straight from
     * `AppWebViewNativeApp`. Only native subscriptions carry it - the WebView's user
     * agent is a hardcoded `KonektaApp/1.0` and says nothing about the installed build.
     *
     * Recorded because the server has to know which notification channels a device
     * actually has before addressing one; see `supportsEmergencyChannel`.
     */
    {
      type: 'text',
      name: 'appVersion',
      required: false,
      admin: {
        readOnly: true,
        description: 'Native app version reported at registration (e.g. "1.4").',
      },
    },
    {
      type: 'text',
      name: 'appBuildNumber',
      required: false,
      admin: {
        readOnly: true,
        description: 'Native app build number reported at registration (e.g. "13").',
      },
    },
    {
      type: 'text',
      name: 'deviceId',
      required: false,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      type: 'date',
      name: 'lastUsedAt',
      required: false,
      admin: {
        readOnly: true,
      },
    },
    {
      type: 'select',
      name: 'registrationSource',
      required: false,
      options: [
        { label: '/entrypoint', value: '/entrypoint' },
        { label: '/app/settings', value: '/app/settings' },
      ],
      admin: {
        readOnly: true,
      },
    },
  ],

  admin: {
    hidden: shouldHideInAdminPanelIfNotAdmin,
    group: AdminPanelDashboardGroups.GlobalSettings,
    groupBy: true,
    /** this is broken with our localized versions */
    disableCopyToLocale: true,
    hideAPIURL: true,
    defaultColumns: ['id', 'user', 'platform', 'updatedAt'],
    components: {
      views: {
        edit: {
          default: {
            Component:
              '@/features/payload-cms/components/push-notification/push-notification-history.tsx',
          },
        },
      },
    },
  },
  access: {
    read: hasAccessToThisHelper({ requiredRoles: [Roles.FullAdmin] }),
    create: () => false, // disable creating subscriptions
    update: () => false, // disable update for subscriptions
    delete: hasAccessToThisHelper({ requiredRoles: [Roles.FullAdmin] }),
  },
});
