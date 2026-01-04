import type { GlobalConfig } from 'payload';

export const SupportChatManagement: GlobalConfig = {
  slug: 'support-chat-management',
  label: {
    en: 'Support Chat Management',
    de: 'Support-Chat-Verwaltung',
    fr: 'Gestion des discussions de support',
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
            Component: '@/features/payload-cms/payload-cms/views/chat-management',
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
