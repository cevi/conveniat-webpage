import { FeatureSettingsKeyWords } from '@/types/feature-settings';
import type { GlobalConfig } from 'payload';

export const SettingsGlobal: GlobalConfig = {
  slug: 'settings',
  label: {
    en: 'Feature Settings',
    de: 'Feature Einstellungen',
    fr: 'Paramètres des fonctionnalités',
  },
  fields: [
    {
      type: 'group',
      label: {
        en: 'Chat Settings',
        de: 'Chat Einstellungen',
        fr: 'Paramètres du chat',
      },
      fields: [
        {
          type: 'checkbox',
          name: FeatureSettingsKeyWords.ChatEnableNewChats,
          label: {
            en: 'Can new chats be started',
            de: 'Können neue Chats gestartet werden',
            fr: 'Les nouveaux chats peuvent-ils être lancés',
          },
          admin: {
            description: {
              en: 'Enable or disable the ability for users to start new chats.',
              de: 'Aktivieren oder deaktivieren Sie die Möglichkeit für Benutzer, neue Chats zu starten.',
              fr: 'Activez ou désactivez la possibilité pour les utilisateurs de lancer de nouveaux chats.',
            },
          },
        },
        {
          type: 'checkbox',
          name: FeatureSettingsKeyWords.ChatEnableNewChatsOnlyQR,
          label: {
            en: 'Only allow new chats via QR code',
            de: 'Neue Chats nur via QR-Code erlauben',
            fr: 'Nouveaux chats uniquement via le code QR',
          },
          admin: {
            description: {
              en: 'If enabled, new chats can only be started via QR codes. Existing chats can still be used.',
              de: 'Wenn aktiviert, können neue Chats nur über QR-Codes gestartet werden. Bestehende Chats können weiterhin genutzt werden.',
              fr: 'Si activé, les nouveaux chats ne peuvent être lancés que via des codes QR. Les chats existants peuvent toujours être utilisés.',
            },
          },
        },
      ],
    },
  ],
};
