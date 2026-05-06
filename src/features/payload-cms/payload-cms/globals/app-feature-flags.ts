import { shouldHideInAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { flushPageCacheOnChangeGlobal } from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import { setFeatureFlag } from '@/lib/db/redis';
import type { GlobalConfig } from 'payload';

export const AppFeatureFlags: GlobalConfig = {
  slug: 'app-feature-flags',
  label: {
    en: 'App Feature Flags',
    de: 'App-Funktions-Flags',
    fr: 'Indicateurs de fonctionnalités',
  },
  admin: {
    group: AdminPanelDashboardGroups.BackofficeAppFeatures,
    hidden: shouldHideInAdminPanel,
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [flushPageCacheOnChangeGlobal],
  },
  fields: [
    {
      name: 'globalMessagingEnabled',
      label: 'Enable Global Messaging',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Toggles the ability for users to send messages globally.',
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/fields/feature-flag-toggle#FeatureFlagToggle',
        },
      },
      hooks: {
        afterChange: [
          async ({ value }): Promise<void> => {
            await setFeatureFlag('send_messages', Boolean(value));
          },
        ],
      },
    },
    {
      name: 'createChatsEnabled',
      label: 'Enable Chat Creation',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'Toggles the ability for users to create new chats (1-on-1 and Group). Emergency/Support chats are excluded.',
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/fields/feature-flag-toggle#FeatureFlagToggle',
        },
      },
      hooks: {
        afterChange: [
          async ({ value }): Promise<void> => {
            // Redis key matching the constant: 'create_chats_enabled'
            await setFeatureFlag('create_chats_enabled', Boolean(value));
          },
        ],
      },
    },
    {
      name: 'helperShiftsEnabled',
      label: {
        en: 'Show Helper Shifts (Schichteinsätze)',
        de: 'Schichteinsätze anzeigen',
        fr: 'Afficher les services de helpers',
      },
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'Toggles visibility of the Helper Shifts (Schichteinsätze) menu item in the app.',
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/fields/feature-flag-toggle#FeatureFlagToggle',
        },
      },
      hooks: {
        afterChange: [
          async ({ value }): Promise<void> => {
            await setFeatureFlag('helper_shifts_enabled', Boolean(value));
          },
        ],
      },
    },
    {
      name: 'imageUploadEnabled',
      label: {
        en: 'Show Image Upload',
        de: 'Bilder hochladen anzeigen',
        fr: 'Afficher le téléchargement de photos',
      },
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Toggles visibility of the Image Upload menu item in the app.',
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/fields/feature-flag-toggle#FeatureFlagToggle',
        },
      },
      hooks: {
        afterChange: [
          async ({ value }): Promise<void> => {
            await setFeatureFlag('image_upload_enabled', Boolean(value));
          },
        ],
      },
    },
    {
      name: 'reservationsEnabled',
      label: {
        en: 'Show Reservations',
        de: 'Reservationen anzeigen',
        fr: 'Afficher les réservations',
      },
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Toggles visibility of the Reservations menu item in the app.',
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/fields/feature-flag-toggle#FeatureFlagToggle',
        },
      },
      hooks: {
        afterChange: [
          async ({ value }): Promise<void> => {
            await setFeatureFlag('reservations_enabled', Boolean(value));
          },
        ],
      },
    },
  ],
};
