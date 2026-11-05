import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { audienceTab } from '@/features/payload-cms/payload-cms/chat-channels/audience-tab';
import { createChannelChatHooks } from '@/features/payload-cms/payload-cms/chat-channels/channel-chat-hooks';
import { channelEndpoints } from '@/features/payload-cms/payload-cms/chat-channels/channel-endpoints';
import { membersTab } from '@/features/payload-cms/payload-cms/chat-channels/members-tab';
import type { ForumTopic } from '@/features/payload-cms/payload-types';
import { ChatCapability } from '@/lib/chat-shared';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma/client';
import type { CollectionConfig } from 'payload';

/**
 * Everything a forum needs, always: posts and comments are messages and threads, a like is a
 * reaction, and a report carries photos. Nothing for the editor to switch.
 */
const FORUM_CAPABILITIES: ChatCapability[] = [
  ChatCapability.CAN_SEND_MESSAGES,
  ChatCapability.PICTURE_UPLOAD,
  ChatCapability.THREADS,
  ChatCapability.THREAD_REPLIES,
  ChatCapability.EMOJI_REACTIONS,
];

const chatHooks = createChannelChatHooks<ForumTopic>({
  slug: 'forum-topics',
  chatType: ChatType.FORUM,
  // the audience writes posts and comments, unlike the guests of an announcement channel
  memberPermission: ChatMembershipPermission.MEMBER,
  capabilities: () => FORUM_CAPABILITIES,
  createdMessage: {
    en: 'Forum topic created',
    de: 'Forum-Thema erstellt',
    fr: 'Thème du forum créé',
  },
});

/**
 * A topic of the conveniat27 forum, like "Platz & Infrastruktur" or "Feedback ans OK". Its
 * audience may post and comment; its owners and admins on the Members tab are its Kernteam:
 * their posts reach the whole audience, and they moderate. The piket on duty for forum chats
 * moderates every topic, see the piket schedule.
 */
export const ForumTopicsCollection: CollectionConfig = {
  slug: 'forum-topics',
  admin: {
    useAsTitle: 'name',
    group: AdminPanelDashboardGroups.AppContent.label,
    defaultColumns: ['name', 'targetType', 'chatUuid'],
    description: {
      en: 'The topics of the forum in the app. Every change someone makes to a post they did not write is in the forum protocol.',
      de: 'Die Themen des Forums in der App. Jede Änderung an einem Beitrag, den jemand nicht selbst geschrieben hat, steht im Forum-Protokoll.',
      fr: 'Les thèmes du forum dans l’app. Chaque modification d’une publication par une autre personne que son auteur figure dans le protocole du forum.',
    },
  },
  labels: {
    singular: { en: 'Forum Topic', de: 'Forum-Thema', fr: 'Thème du forum' },
    plural: { en: 'Forum Topics', de: 'Forum-Themen', fr: 'Thèmes du forum' },
  },
  access: {
    read: hasAdminOrWebAccess,
    create: hasAdminOrWebAccess,
    update: hasAdminOrWebAccess,
    delete: hasAdminOrWebAccess,
  },
  endpoints: channelEndpoints(),
  hooks: {
    afterChange: [chatHooks.afterChange],
    afterDelete: [chatHooks.afterDelete],
  },
  fields: [
    {
      name: 'chatUuid',
      label: { en: 'Chat ID', de: 'Chat-ID', fr: 'ID du chat' },
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: { en: 'Topic', de: 'Thema', fr: 'Thème' },
          fields: [
            {
              name: 'name',
              label: {
                en: 'Name in the app',
                de: 'Name in der App',
                fr: 'Nom dans l’app',
              },
              type: 'text',
              required: true,
              admin: {
                description: {
                  en: 'e.g. "Platz & Infrastruktur", "Programm", "Feedback ans OK"',
                  de: 'z.B. «Platz & Infrastruktur», «Programm», «Feedback ans OK»',
                  fr: 'p. ex. « Platz & Infrastruktur », « Programm », « Feedback ans OK »',
                },
              },
            },
            {
              name: 'description',
              label: { en: 'Description', de: 'Beschreibung', fr: 'Description' },
              type: 'text',
            },
          ],
        },
        audienceTab(),
        membersTab(),
      ],
    },
  ],
};
