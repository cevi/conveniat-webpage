import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { audienceTab } from '@/features/payload-cms/payload-cms/chat-channels/audience-tab';
import { createChannelChatHooks } from '@/features/payload-cms/payload-cms/chat-channels/channel-chat-hooks';
import { channelEndpoints } from '@/features/payload-cms/payload-cms/chat-channels/channel-endpoints';
import { membersTab } from '@/features/payload-cms/payload-cms/chat-channels/members-tab';
import type { AnnouncementChannel } from '@/features/payload-cms/payload-types';
import { ChatCapability } from '@/lib/chat-shared';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma/enums';
import type { CollectionConfig } from 'payload';

/** What members may do in the chat, as the editor ticked it on the Chat tab. */
const capabilitiesOf = (channel: AnnouncementChannel): ChatCapability[] => {
  const capabilities: ChatCapability[] = [ChatCapability.CAN_SEND_MESSAGES];
  if (channel.allowEmojiReactions === true) {
    capabilities.push(ChatCapability.EMOJI_REACTIONS);
  }
  if (channel.allowThreads === true) {
    capabilities.push(ChatCapability.THREADS);
    if (channel.allowThreadReplies === true) {
      capabilities.push(ChatCapability.THREAD_REPLIES);
    }
  }
  return capabilities;
};

const chatHooks = createChannelChatHooks<AnnouncementChannel>({
  slug: 'announcement-channels',
  chatType: ChatType.ANNOUNCEMENT,
  memberPermission: ChatMembershipPermission.GUEST,
  capabilities: capabilitiesOf,
  createdMessage: {
    en: 'Announcement channel created',
    de: 'Ankündigungskanal erstellt',
    fr: "Canal d'annonces créé",
  },
});

export const AnnouncementChannelsCollection: CollectionConfig = {
  slug: 'announcement-channels',
  admin: {
    useAsTitle: 'internalName',
    group: AdminPanelDashboardGroups.AppContent.label,
    defaultColumns: ['internalName', 'name', 'targetType', 'pinned', 'chatUuid'],
  },
  labels: {
    singular: {
      en: 'Announcement Channel',
      de: 'Ankündigungskanal',
      fr: "Canal d'annonces",
    },
    plural: {
      en: 'Announcement Channels',
      de: 'Ankündigungskanäle',
      fr: "Canaux d'annonces",
    },
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
      name: 'internalName',
      label: {
        en: 'Internal name',
        de: 'Interner Name',
        fr: 'Nom interne',
      },
      type: 'text',
      required: true,
      admin: {
        position: 'sidebar',
        description: {
          en: 'Only visible in the admin panel. Pick this name when you link an announcement to the channel.',
          de: 'Nur im Admin-Panel sichtbar. Unter diesem Namen wählst du den Kanal für eine Ankündigung aus.',
          fr: "Visible uniquement dans le panneau d'administration. C'est sous ce nom que tu choisis le canal d'une annonce.",
        },
      },
    },
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
          label: { en: 'Chat', de: 'Chat', fr: 'Chat' },
          admin: {
            description: {
              en: 'What members see of the channel in the app, and what they may do in it.',
              de: 'Was die Mitglieder in der App vom Kanal sehen und was sie darin tun dürfen.',
              fr: "Ce que les membres voient du canal dans l'app, et ce qu'ils peuvent y faire.",
            },
          },
          fields: [
            {
              name: 'name',
              label: {
                en: 'Chat name in the app',
                de: 'Chatname in der App',
                fr: "Nom du chat dans l'app",
              },
              type: 'text',
              required: true,
              admin: {
                description: {
                  en: 'Shown to all members as the name of the chat.',
                  de: 'Wird allen Mitgliedern als Name des Chats angezeigt.',
                  fr: 'Affiché à tous les membres comme nom du chat.',
                },
              },
            },
            {
              name: 'description',
              label: {
                en: 'Description',
                de: 'Beschreibung',
                fr: 'Description',
              },
              type: 'text',
            },
            {
              name: 'pinned',
              label: {
                en: 'Pin in the chat overview',
                de: 'In der Chatübersicht anheften',
                fr: 'Épingler dans la liste des discussions',
              },
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description: {
                  en: 'Pinned channels stay at the top of the chat overview, above all other chats.',
                  de: 'Angeheftete Kanäle stehen in der Chatübersicht immer zuoberst, über allen anderen Chats.',
                  fr: 'Les canaux épinglés restent en haut de la liste des discussions, au-dessus de toutes les autres.',
                },
              },
            },
            {
              name: 'allowEmojiReactions',
              label: {
                en: 'Allow Emoji Reactions',
                de: 'Emoji-Reaktionen erlauben',
                fr: 'Autoriser les réactions emoji',
              },
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'allowThreads',
              label: {
                en: 'Allow Threads',
                de: 'Threads erlauben',
                fr: 'Autoriser les fils de discussion',
              },
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'allowThreadReplies',
              label: {
                en: 'Allow Replies in Threads (for Guest/Reader Users)',
                de: 'Antworten in Threads erlauben (für Gäste/Leser)',
                fr: 'Autoriser les réponses dans les fils (pour les invités/lecteurs)',
              },
              type: 'checkbox',
              defaultValue: false,
              admin: {
                condition: (data) => !!data['allowThreads'],
              },
            },
          ],
        },
        audienceTab(),
        membersTab(),
      ],
    },
  ],
};
