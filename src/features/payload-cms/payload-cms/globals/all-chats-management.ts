import type { GlobalConfig } from 'payload';

export const AllChatsManagement: GlobalConfig = {
  slug: 'all-chats-management',
  label: {
    en: 'Chat Capability Management',
    de: 'Chat-Berechtigungsverwaltung',
    fr: 'Gestion des capacités de chat',
  },
  access: {
    read: () => true,
  },
  admin: {
    group: {
      en: 'Backoffice App Features',
      de: 'Backoffice App Funktionen',
      fr: 'Fonctionnalités Backoffice',
    },
    hideAPIURL: true,
    components: {
      views: {
        edit: {
          default: {
            Component: '@/features/payload-cms/payload-cms/views/all-chats-management',
          },
        },
      },
    },
  },
  fields: [
    {
      name: 'dummy',
      type: 'text',
      hidden: true,
    },
  ],
};
