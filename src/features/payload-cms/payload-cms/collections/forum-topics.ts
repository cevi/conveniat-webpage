import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { audienceTab } from '@/features/payload-cms/payload-cms/chat-channels/audience-tab';
import { createChannelChatHooks } from '@/features/payload-cms/payload-cms/chat-channels/channel-chat-hooks';
import { channelEndpoints } from '@/features/payload-cms/payload-cms/chat-channels/channel-endpoints';
import { syncChannelMemberships } from '@/features/payload-cms/payload-cms/chat-channels/channel-memberships';
import { syncForumKernteam } from '@/features/payload-cms/payload-cms/chat-channels/forum-kernteam';
import { membersTab } from '@/features/payload-cms/payload-cms/chat-channels/members-tab';
import { toFunktionIds } from '@/features/payload-cms/payload-cms/utils/funktionen';
import type { ForumTopic } from '@/features/payload-cms/payload-types';

import { ChatCapability, ChatMembershipPermission, ChatType } from '@/lib/prisma/enums';
import { FORUM_TOPIC_ICONS, type ForumTopicIcon } from '@/lib/forum-shared';
import type { StaticTranslationString } from '@/types/types';
import type { CollectionAfterChangeHook, CollectionConfig } from 'payload';

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

const iconLabels: Record<ForumTopicIcon, StaticTranslationString> = {
  'message-circle': { en: 'Speech bubble', de: 'Sprechblase', fr: 'Bulle' },
  tent: { en: 'Tent', de: 'Zelt', fr: 'Tente' },
  wrench: { en: 'Wrench', de: 'Werkzeug', fr: 'Outil' },
  utensils: { en: 'Cutlery', de: 'Besteck', fr: 'Couverts' },
  star: { en: 'Star', de: 'Stern', fr: 'Étoile' },
  calendar: { en: 'Calendar', de: 'Kalender', fr: 'Calendrier' },
  bus: { en: 'Bus', de: 'Bus', fr: 'Bus' },
  heart: { en: 'Heart', de: 'Herz', fr: 'Cœur' },
  shield: { en: 'Shield', de: 'Schild', fr: 'Bouclier' },
  info: { en: 'Info', de: 'Info', fr: 'Info' },
  map: { en: 'Map', de: 'Karte', fr: 'Carte' },
};

/**
 * Makes the holders of the topic's Kernteam functions its admins, after the audience sync of
 * `chatHooks`. Whoever that made an ordinary member is synced against the audience once more,
 * so a former Kernteam member outside the audience leaves the topic right away.
 */
const syncKernteamOfTopic: CollectionAfterChangeHook<ForumTopic> = async ({ doc, req }) => {
  // the chat of a new topic exists once `chatHooks` wrote its id back, which saves again
  if (typeof doc.chatUuid !== 'string' || doc.chatUuid === '') return doc;
  const demoted = await syncForumKernteam(doc.chatUuid, toFunktionIds(doc.kernteamFunktionen));
  if (demoted > 0) {
    await syncChannelMemberships(req.payload, doc.chatUuid, doc, {
      memberPermission: ChatMembershipPermission.MEMBER,
      req,
      actorId: req.user?.id,
    });
  }
  return doc;
};

/**
 * A topic of the conveniat27 forum, like "Platz & Infrastruktur" or "Feedback ans OK". Its
 * audience may post and comment; the holders of its Kernteam functions are its Kernteam, see
 * `forum-kernteam.ts`: their posts reach the whole audience, and they moderate. The piket on duty for forum chats
 * moderates every topic, see the piket schedule.
 */
export const ForumTopicsCollection: CollectionConfig = {
  slug: 'forum-topics',
  admin: {
    useAsTitle: 'name',
    group: AdminPanelDashboardGroups.AppContent.label,
    components: {
      edit: {
        beforeDocumentControls: [
          '@/features/payload-cms/payload-cms/components/forum/open-topic-in-app',
        ],
      },
    },
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
    afterChange: [chatHooks.afterChange, syncKernteamOfTopic],
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
            {
              name: 'kernteamFunktionen',
              label: { en: 'Core team', de: 'Kernteam', fr: 'Équipe centrale' },
              type: 'relationship',
              relationTo: 'funktionen',
              hasMany: true,
              admin: {
                description: {
                  en: 'Whoever holds one of these functions is the core team of this topic: they moderate it, their posts reach everyone, and the app shows the function as a badge with their name. Who holds a function is changed in Cevi.DB.',
                  de: 'Wer eine dieser Funktionen innehat, ist das Kernteam dieses Themas: moderiert es, erreicht mit Beiträgen alle, und die App zeigt die Funktion als Badge beim Namen. Wer eine Funktion innehat, wird in der Cevi.DB geändert.',
                  fr: 'Qui occupe l’une de ces fonctions forme l’équipe centrale de ce thème : la modère, atteint tout le monde avec ses publications, et l’app affiche la fonction comme badge à côté du nom. Qui occupe une fonction se modifie dans Cevi.DB.',
                },
              },
            },
            {
              name: 'icon',
              label: { en: 'Icon', de: 'Symbol', fr: 'Icône' },
              type: 'select',
              required: true,
              defaultValue: 'message-circle',
              options: FORUM_TOPIC_ICONS.map((icon) => ({ value: icon, label: iconLabels[icon] })),
              admin: {
                description: {
                  en: 'Shown next to the topic in the list of topics in the app.',
                  de: 'Steht in der App neben dem Thema in der Liste der Themen.',
                  fr: 'Affichée à côté du thème dans la liste des thèmes de l’app.',
                },
              },
            },
            {
              name: 'allowsPrivateConversations',
              label: {
                en: 'Allows private conversations',
                de: 'Erlaubt private Gespräche',
                fr: 'Permet les conversations privées',
              },
              type: 'checkbox',
              defaultValue: true,
              admin: {
                description: {
                  en: 'The topic offers "Write the core team privately": a conversation only its writer, the core team of this topic, the piket on duty and the Zentrale read.',
                  de: 'Das Thema bietet «Kernteam privat schreiben»: ein Gespräch, das nur die schreibende Person, das Kernteam dieses Themas, das Piket im Dienst und die Zentrale lesen.',
                  fr: 'Le thème propose « Écrire en privé à l’équipe centrale » : une conversation que seuls son auteur, l’équipe centrale de ce thème, le piquet de service et la Zentrale lisent.',
                },
              },
            },
            {
              name: 'moderationRequired',
              label: {
                en: 'Approve posts before they are published',
                de: 'Beiträge vor Veröffentlichung freigeben',
                fr: 'Approuver les publications avant leur parution',
              },
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description: {
                  en: 'A new post is seen only by its author and the moderators until one of them approves it. Posts by the core team need no approval, comments are never held back. The switch in App Features does this for every topic at once.',
                  de: 'Einen neuen Beitrag sehen nur die Person, die ihn geschrieben hat, und die Moderation, bis jemand davon ihn freigibt. Beiträge des Kernteams brauchen keine Freigabe, Kommentare werden nie zurückgehalten. Der Schalter in den App-Funktionen tut das für alle Themen auf einmal.',
                  fr: 'Une nouvelle publication n’est visible que par son auteur et la modération jusqu’à ce que quelqu’un l’approuve. Les publications de l’équipe centrale n’ont pas besoin d’approbation, les commentaires ne sont jamais retenus. L’interrupteur des fonctions de l’app le fait pour tous les thèmes à la fois.',
                },
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
