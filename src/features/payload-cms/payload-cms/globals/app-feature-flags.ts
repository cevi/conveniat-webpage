import { shouldHideInAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { setFeatureFlag } from '@/lib/db/redis';
import {
  FEATURE_FLAG_CREATE_CHATS_ENABLED,
  FEATURE_FLAG_SEND_MESSAGES,
  FEATURE_HIDE_HOF_AND_QUARTIER,
} from '@/lib/feature-flags';
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
            await setFeatureFlag(FEATURE_FLAG_SEND_MESSAGES, Boolean(value));
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
            await setFeatureFlag(FEATURE_FLAG_CREATE_CHATS_ENABLED, Boolean(value));
          },
        ],
      },
    },
    {
      name: 'hideHofAndQuartier',
      label: 'Hide Hof and Quartier',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Hides the Hof and Quartier sections in the app. This is used for testing purposes.',
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/fields/feature-flag-toggle#FeatureFlagToggle',
        },
      },
      hooks: {
        afterChange: [
          async ({ value }): Promise<void> => {
            await setFeatureFlag(FEATURE_HIDE_HOF_AND_QUARTIER, Boolean(value));
          },
        ],
      },
    },
  ],
};
