import {
  hasAdminOrWebAccess,
  shouldHideInAdminPanel,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { GlobalConfig } from 'payload';

/**
 * Members, the creator included, a group created by a participant may have until an editor
 * saves another value. Also what applies before the setting was saved for the first time.
 */
export const DEFAULT_MAX_GROUP_MEMBERS = 32;

export const AllChatsManagement: GlobalConfig = {
  slug: 'all-chats-management',
  label: {
    en: 'Chat Capability Management',
    de: 'Chat-Berechtigungsverwaltung',
    fr: 'Gestion des capacités de chat',
  },
  access: {
    read: () => true,
    update: hasAdminOrWebAccess,
  },
  admin: {
    group: AdminPanelDashboardGroups.AppOperations.label,
    hideAPIURL: true,
    hidden: shouldHideInAdminPanel,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: { en: 'Chats', de: 'Chats', fr: 'Chats' },
          fields: [
            {
              name: 'chatList',
              type: 'ui',
              admin: {
                components: {
                  Field: '@/features/payload-cms/components/chat-manager/chat-list-manager-field',
                },
              },
            },
          ],
        },
        {
          label: { en: 'Settings', de: 'Einstellungen', fr: 'Paramètres' },
          fields: [
            {
              name: 'maxGroupMembers',
              type: 'number',
              required: true,
              min: 3,
              defaultValue: DEFAULT_MAX_GROUP_MEMBERS,
              label: {
                en: 'Maximum group size',
                de: 'Maximale Gruppengrösse',
                fr: 'Taille maximale d’un groupe',
              },
              admin: {
                description: {
                  en: 'How many members, the creator included, a group chat created by a participant may have. Groups set up by admins and announcement channels have no limit.',
                  de: 'Wie viele Mitglieder, inklusive der erstellenden Person, ein von Teilnehmenden erstellter Gruppenchat haben darf. Von Admins eingerichtete Gruppen und Ankündigungskanäle sind nicht begrenzt.',
                  fr: 'Combien de membres, créateur compris, un chat de groupe créé par un participant peut compter. Les groupes créés par les admins et les canaux d’annonces ne sont pas limités.',
                },
              },
            },
          ],
        },
      ],
    },
  ],
};
