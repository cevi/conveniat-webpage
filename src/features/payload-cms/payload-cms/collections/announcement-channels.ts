import { environmentVariables } from '@/config/environment-variables';
import { ROLE_LABELS } from '@/features/payload-cms/payload-cms/access-rules/role-labels';
import { hasAdminOrWebAccess, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import {
  audiencePreviewHandler,
  groupSuggestionsHandler,
} from '@/features/payload-cms/payload-cms/endpoints/announcement-channel-audience';
import type { ChannelAudience } from '@/features/payload-cms/payload-cms/utils/announcement-channel-audience';
import { findAudienceUserIds } from '@/features/payload-cms/payload-cms/utils/announcement-channel-audience';
import type { AnnouncementChannel } from '@/features/payload-cms/payload-types';
import { ChatCapability, ChatStatus } from '@/lib/chat-shared';
import prisma from '@/lib/db/prisma';
import { publishMembershipRevoked } from '@/lib/db/publish-membership-revoked';
import {
  ChatMembershipPermission,
  ChatType,
  MessageEventType,
  MessageType,
} from '@/lib/prisma/client';
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
  PayloadRequest,
} from 'payload';

/**
 * Reconciles the GUEST memberships of a channel's chat with its audience: adds whoever
 * belongs to it and removes whoever no longer does. Owners and admins stay.
 */
const syncAnnouncementChannelMemberships = async (
  chatUuid: string,
  audience: ChannelAudience,
  request: PayloadRequest,
): Promise<void> => {
  const eligibleUserUuids = new Set(await findAudienceUserIds(request.payload, audience, request));

  // Fetch existing PostgreSQL memberships for this chat
  const existingMemberships = await prisma.chatMembership.findMany({
    where: { chatId: chatUuid },
  });

  const existingUserUuids = new Set(existingMemberships.map((m) => m.userId));

  // Add missing members as GUEST
  // eslint-disable-next-line unicorn/prefer-spread
  const membersToAdd = Array.from(eligibleUserUuids).filter((uuid) => !existingUserUuids.has(uuid));
  if (membersToAdd.length > 0) {
    // Only synchronize users who actually exist in the PostgreSQL User table to avoid foreign key violations.
    const existingPostgresUsers = await prisma.user.findMany({
      where: {
        uuid: { in: membersToAdd },
      },
      select: {
        uuid: true,
      },
    });
    const existingPostgresUserUuids = new Set(existingPostgresUsers.map((u) => u.uuid));
    const validMembersToAdd = membersToAdd.filter((uuid) => existingPostgresUserUuids.has(uuid));

    if (validMembersToAdd.length > 0) {
      await prisma.chatMembership.createMany({
        data: validMembersToAdd.map((uuid) => ({
          chatId: chatUuid,
          userId: uuid,
          chatPermission: ChatMembershipPermission.GUEST,
        })),
      });
    }
  }

  // Remove users who are no longer eligible (excluding OWNER/ADMIN)
  const membersToRemove = existingMemberships.filter((m) => {
    if (
      m.chatPermission === ChatMembershipPermission.OWNER ||
      m.chatPermission === ChatMembershipPermission.ADMIN
    ) {
      return false;
    }
    return !eligibleUserUuids.has(m.userId);
  });

  if (membersToRemove.length > 0) {
    await prisma.chatMembership.deleteMany({
      where: {
        chatId: chatUuid,
        userId: { in: membersToRemove.map((m) => m.userId) },
      },
    });

    // Written outside a transaction, so the deletion is already committed here.
    await Promise.all(
      membersToRemove.map((m) =>
        publishMembershipRevoked(m.userId, chatUuid, request.user?.id ?? m.userId),
      ),
    );
  }
};

/** Marks the update that only stores the id of a newly created chat. */
const CHAT_ID_WRITE_BACK = 'announcementChannelChatIdWriteBack';

const afterChannelChange: CollectionAfterChangeHook<AnnouncementChannel> = async ({
  doc,
  req: request,
  operation,
  context,
}) => {
  // the write-back of the chat id below; the outer run already set up the chat and its members
  if (context[CHAT_ID_WRITE_BACK] === true) return doc;

  const name = doc.name;
  const description = doc.description;
  let chatUuid = doc.chatUuid;

  const currentAdminUuid = request.user?.id;

  // Build the capabilities array dynamically based on the CMS selections
  const capabilities: ChatCapability[] = [ChatCapability.CAN_SEND_MESSAGES];
  if (doc['allowEmojiReactions']) {
    capabilities.push(ChatCapability.EMOJI_REACTIONS);
  }
  if (doc['allowThreads']) {
    capabilities.push(ChatCapability.THREADS);
    if (doc['allowThreadReplies']) {
      capabilities.push(ChatCapability.THREAD_REPLIES);
    }
  }

  if (operation === 'create' || chatUuid === undefined || chatUuid === null || chatUuid === '') {
    // A. CREATE: Set up PostgreSQL Chat & default Owner/Admin
    const newChat = await prisma.chat.create({
      data: {
        name: name,
        description: description ?? '',
        type: ChatType.ANNOUNCEMENT,
        status: ChatStatus.OPEN,
        capabilities: capabilities,
        pinned: doc.pinned === true,
        messages: {
          create: {
            contentVersions: {
              create: [
                {
                  payload: {
                    en: 'Announcement channel created',
                    de: 'Ankündigungskanal erstellt',
                    fr: "Canal d'annonces créé",
                  },
                },
              ],
            },
            type: MessageType.SYSTEM_MSG,
            messageEvents: {
              create: [{ type: MessageEventType.CREATED }, { type: MessageEventType.STORED }],
            },
          },
        },
        chatMemberships: {
          create:
            currentAdminUuid !== undefined && currentAdminUuid !== ''
              ? [
                  {
                    userId: currentAdminUuid,
                    chatPermission: ChatMembershipPermission.OWNER,
                  },
                ]
              : [],
        },
      },
    });

    chatUuid = newChat.uuid;
    doc.chatUuid = chatUuid;

    // Immediately update Payload doc with the created PostgreSQL chat UUID
    await request.payload.update({
      collection: 'announcement-channels',
      id: doc.id,
      data: { chatUuid },
      context: { [CHAT_ID_WRITE_BACK]: true },
    });
  } else {
    // B. UPDATE: Reconcile Chat details in PostgreSQL
    await prisma.chat.update({
      where: { uuid: chatUuid },
      data: {
        name,
        description: description ?? '',
        capabilities: capabilities,
        pinned: doc.pinned === true,
        lastUpdate: new Date(),
      },
    });
  }

  // C. Sync targeted GUEST memberships
  await syncAnnouncementChannelMemberships(chatUuid, doc, request);

  return doc;
};

const afterChannelDelete: CollectionAfterDeleteHook<AnnouncementChannel> = async ({ doc, req }) => {
  const chatUuid = doc.chatUuid;
  if (chatUuid !== undefined && chatUuid !== null && chatUuid !== '') {
    // Delete PostgreSQL chat structure cascade-deletes memberships & messages
    await prisma.chat
      .delete({
        where: { uuid: chatUuid },
      })
      .catch((error: unknown) => {
        req.payload.logger.error(
          { error, 'chat.id': chatUuid },
          'Failed to cascade-delete the postgres chat on CMS channel deletion',
        );
      });
  }
};

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
  endpoints: [
    { path: '/group-suggestions', method: 'get', handler: groupSuggestionsHandler },
    { path: '/audience-preview', method: 'post', handler: audiencePreviewHandler },
  ],
  hooks: {
    afterChange: [afterChannelChange],
    afterDelete: [afterChannelDelete],
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
        {
          label: { en: 'Audience', de: 'Zielgruppe', fr: 'Public cible' },
          admin: {
            description: {
              en: 'Who is added to the channel. Saving updates the members right away.',
              de: 'Wer in den Kanal aufgenommen wird. Beim Speichern werden die Mitglieder sofort angepasst.',
              fr: 'Qui est ajouté au canal. L’enregistrement met les membres à jour immédiatement.',
            },
          },
          fields: [
            {
              name: 'targetType',
              label: {
                en: 'Target Group Type',
                de: 'Zielgruppentyp',
                fr: 'Type de groupe cible',
              },
              type: 'select',
              required: true,
              defaultValue: 'all',
              options: [
                {
                  label: { en: 'All Users', de: 'Alle Benutzer', fr: 'Tous les utilisateurs' },
                  value: 'all',
                },
                {
                  label: {
                    en: 'Specific Roles',
                    de: 'Spezifische Rollen',
                    fr: 'Rôles spécifiques',
                  },
                  value: 'roles',
                },
                {
                  label: { en: 'Cevi.DB groups', de: 'Cevi.DB-Gruppen', fr: 'Groupes Cevi.DB' },
                  value: 'cevi_groups',
                },
                {
                  label: { en: 'All AVPs', de: 'Alle AVPs', fr: 'Tous les AVP' },
                  value: 'avps',
                },
              ],
              // the AVPs are found through the Höfe, which only the Hof dashboard keeps
              filterOptions: ({ options }) =>
                environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD
                  ? options
                  : options.filter(
                      (option) => (typeof option === 'string' ? option : option.value) !== 'avps',
                    ),
            },
            {
              name: 'targetRoles',
              label: {
                en: 'Target Roles',
                de: 'Zielrollen',
                fr: 'Rôles cibles',
              },
              type: 'select',
              hasMany: true,
              options: Object.values(Roles).map((role) => ({
                label: ROLE_LABELS[role],
                value: role,
              })),
              admin: {
                condition: (data) => data['targetType'] === 'roles',
              },
            },
            {
              name: 'targetCeviGroups',
              label: {
                en: 'Target Cevi.DB groups',
                de: 'Ziel-Cevi.DB-Gruppen',
                fr: 'Groupes Cevi.DB cibles',
              },
              labels: {
                singular: { en: 'Cevi.DB group', de: 'Cevi.DB-Gruppe', fr: 'Groupe Cevi.DB' },
                plural: { en: 'Cevi.DB groups', de: 'Cevi.DB-Gruppen', fr: 'Groupes Cevi.DB' },
              },
              type: 'array',
              admin: {
                condition: (data) => data['targetType'] === 'cevi_groups',
                description: {
                  en: 'Everyone who is in one of these groups in Cevi.DB. Pick a group by its name or type its ID.',
                  de: 'Alle, die in der Cevi.DB in einer dieser Gruppen sind. Wähle eine Gruppe über ihren Namen aus oder gib ihre ID ein.',
                  fr: "Toutes les personnes membres d'un de ces groupes dans Cevi.DB. Choisis un groupe par son nom ou saisis son ID.",
                },
                components: {
                  RowLabel:
                    '@/features/payload-cms/payload-cms/components/announcement-channel/cevi-group-row-label#CeviGroupRowLabel',
                },
              },
              fields: [
                {
                  name: 'groupId',
                  label: { en: 'Cevi.DB group', de: 'Cevi.DB-Gruppe', fr: 'Groupe Cevi.DB' },
                  type: 'number',
                  required: true,
                  admin: {
                    components: {
                      Field:
                        '@/features/payload-cms/payload-cms/components/announcement-channel/cevi-group-picker#CeviGroupPicker',
                    },
                  },
                },
                {
                  // filled in by the picker; only shown so a group typed in by its ID can be named
                  name: 'groupName',
                  label: { en: 'Group Name', de: 'Gruppenname', fr: 'Nom du groupe' },
                  type: 'text',
                },
              ],
            },
            {
              name: 'audiencePreview',
              type: 'ui',
              admin: {
                components: {
                  Field:
                    '@/features/payload-cms/payload-cms/components/announcement-channel/audience-preview#AudiencePreview',
                },
                disableListColumn: true,
              },
            },
          ],
        },
        {
          label: { en: 'Members', de: 'Mitglieder', fr: 'Membres' },
          fields: [
            {
              name: 'members',
              type: 'ui',
              admin: {
                components: {
                  Field:
                    '@/features/payload-cms/payload-cms/components/announcement-channel/channel-members#ChannelMembersField',
                },
                disableListColumn: true,
              },
            },
          ],
        },
      ],
    },
  ],
};
