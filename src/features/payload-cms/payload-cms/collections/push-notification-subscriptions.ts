import {
  isFullAdmin,
  shouldHideInAdminPanelIfNotAdmin,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';

export const PushNotificationSubscriptions: CollectionConfig = {
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
      type: 'tabs',
      tabs: [
        {
          label: { en: 'Notifications', de: 'Benachrichtigungen', fr: 'Notifications' },
          fields: [
            {
              name: 'notifications',
              type: 'ui',
              admin: {
                components: {
                  Field:
                    '@/features/payload-cms/components/push-notification/push-notification-panel',
                },
                disableListColumn: true,
              },
            },
          ],
        },
        {
          label: { en: 'Subscription', de: 'Abonnement', fr: 'Abonnement' },
          fields: [
            {
              type: 'text',
              name: 'endpoint',
              label: { en: 'Endpoint', de: 'Endpunkt', fr: 'Point de terminaison' },
              required: false,
              admin: {
                readOnly: true,
              },
            },
            {
              type: 'text',
              name: 'token',
              label: { en: 'Token', de: 'Token', fr: 'Jeton' },
              unique: true,
              required: false,
              admin: {
                readOnly: true,
              },
            },
            {
              type: 'group',
              name: 'keys',
              label: { en: 'Keys', de: 'Schlüssel', fr: 'Clés' },
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
              type: 'number',
              name: 'expirationTime',
              label: { en: 'Expiration time', de: 'Ablaufzeit', fr: "Date d'expiration" },
              required: false,
              admin: {
                readOnly: true,
              },
            },
            {
              type: 'text',
              name: 'userAgent',
              label: { en: 'User agent', de: 'User-Agent', fr: 'User-Agent' },
              required: false,
              admin: {
                readOnly: true,
              },
            },
          ],
        },
      ],
    },
    {
      name: 'user',
      label: { en: 'User', de: 'Benutzer', fr: 'Utilisateur' },
      relationTo: 'users',
      type: 'relationship',
      admin: {
        position: 'sidebar',
      },
    },
    {
      type: 'select',
      name: 'platform',
      label: { en: 'Platform', de: 'Plattform', fr: 'Plateforme' },
      required: true,
      defaultValue: 'web',
      options: [
        { label: 'Web', value: 'web' },
        { label: 'iOS', value: 'ios' },
        { label: 'Android', value: 'android' },
      ],
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      type: 'date',
      name: 'lastUsedAt',
      label: { en: 'Last used', de: 'Zuletzt verwendet', fr: 'Dernière utilisation' },
      required: false,
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      type: 'select',
      name: 'registrationSource',
      label: { en: 'Registered from', de: 'Registriert über', fr: 'Enregistré depuis' },
      required: false,
      options: [
        { label: '/entrypoint', value: '/entrypoint' },
        { label: '/app/settings', value: '/app/settings' },
      ],
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      type: 'text',
      name: 'deviceId',
      label: { en: 'Device ID', de: 'Geräte-ID', fr: "ID de l'appareil" },
      required: false,
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],

  admin: {
    hidden: shouldHideInAdminPanelIfNotAdmin,
    group: AdminPanelDashboardGroups.AppOperations.label,
    groupBy: true,
    /** this is broken with our localized versions */
    disableCopyToLocale: true,
    hideAPIURL: true,
    defaultColumns: ['id', 'user', 'platform', 'updatedAt'],
  },
  access: {
    read: isFullAdmin,
    create: () => false, // disable creating subscriptions
    update: () => false, // disable update for subscriptions
    delete: isFullAdmin,
  },
};
