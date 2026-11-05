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
import { ChatCapability } from '@/lib/chat-shared';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma/client';
import type { StaticTranslationString } from '@/types/types';
import type { CheckboxFieldValidation, CollectionAfterChangeHook, CollectionConfig } from 'payload';

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

const alreadyReceivingText: StaticTranslationString = {
  en: 'The topic "{name}" already receives the private reports. Untick it there first.',
  de: 'Das Thema «{name}» empfängt bereits die privaten Meldungen. Entferne dort zuerst das Häkchen.',
  fr: 'Le thème « {name} » reçoit déjà les signalements privés. Décoche-le d’abord là-bas.',
};

/** Private reports go to one topic, so a second one cannot be ticked. */
const onlyOneTopicReceivesPrivateReports: CheckboxFieldValidation = async (value, { req, id }) => {
  if (value !== true) return true;
  const others = await req.payload.find({
    collection: 'forum-topics',
    where: {
      and: [
        { receivesPrivateReports: { equals: true } },
        ...(id === undefined ? [] : [{ id: { not_equals: id } }]),
      ],
    },
    limit: 1,
    depth: 0,
    req,
  });
  const other = others.docs[0];
  if (other === undefined) return true;
  const language =
    req.i18n.language === 'fr' || req.i18n.language === 'en' ? req.i18n.language : 'de';
  return alreadyReceivingText[language].replace('{name}', other.name);
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
              name: 'receivesPrivateReports',
              label: {
                en: 'Receives private reports',
                de: 'Empfängt private Meldungen',
                fr: 'Reçoit les signalements privés',
              },
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description: {
                  en: 'A report sent "privately to the Zentrale" becomes a post in this topic that only its author, the Kernteam of this topic and the piket on duty see. One topic at most; whoever reports joins it for their own reports.',
                  de: 'Eine Meldung «privat an die Zentrale» wird ein Beitrag in diesem Thema, den nur die meldende Person, das Kernteam dieses Themas und das Piket im Dienst sehen. Höchstens ein Thema; wer meldet, wird für die eigenen Meldungen Mitglied.',
                  fr: 'Un signalement « en privé à la Zentrale » devient une publication de ce thème que seuls son auteur, l’équipe centrale de ce thème et le piquet de service voient. Un seul thème au plus ; qui signale en devient membre pour ses propres signalements.',
                },
              },
              validate: onlyOneTopicReceivesPrivateReports,
            },
          ],
        },
        audienceTab(),
        membersTab(),
      ],
    },
  ],
};
