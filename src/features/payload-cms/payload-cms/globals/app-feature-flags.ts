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
    group: {
      en: 'Backoffice App Features',
      de: 'Backoffice App Funktionen',
      fr: 'Fonctionnalités Backoffice',
    },
  },
  access: {
    read: () => true,
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
  ],
};
