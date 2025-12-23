import { setFeatureFlag } from '@/lib/redis';
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
      label: {
        en: 'Enable Global Messaging',
        de: 'Globales Messaging aktivieren',
        fr: 'Activer la messagerie mondiale',
      },
      type: 'checkbox',
      defaultValue: true,
      hooks: {
        afterChange: [
          async ({ value }): Promise<void> => {
            await setFeatureFlag('send_messages', Boolean(value));
          },
        ],
      },
    },
  ],
};
