/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { environmentVariables } from '@/config/environment-variables';
import { hasAdminOrWebAccess, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { AnnouncementChannel } from '@/features/payload-cms/payload-types';
import { ChatCapability, ChatStatus } from '@/lib/chat-shared';
import prisma from '@/lib/db/prisma';
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

const ROLE_GROUP_IDS = {
  [Roles.FullAdmin]: environmentVariables.CEVIDB_GROUP_FULL_ADMIN,
  [Roles.WebCoreTeam]: environmentVariables.CEVIDB_GROUP_WEB_CORE_TEAM,
  [Roles.TranslationTeam]: environmentVariables.CEVIDB_GROUP_TRANSLATION_TEAM,
  [Roles.ProgramTeam]: environmentVariables.CEVIDB_GROUP_PROGRAM_TEAM,
};

const syncAnnouncementChannelMemberships = async (
  chatUuid: string,
  targetType: 'all' | 'roles' | 'cevi_groups',
  targetRoles: string[] | undefined | null,
  targetCeviGroups:
    | {
        groupId: number;
        groupName?: string | null;
        id?: string | null;
      }[]
    | undefined
    | null,
  request: PayloadRequest,
): Promise<void> => {
  // 1. Fetch all users from MongoDB
  const usersResult = await request.payload.find({
    collection: 'users',
    limit: 10_000,
    depth: 0,
  });

  const allUsers = usersResult.docs;

  // 2. Filter matching users based on target group settings
  const matchingUsers = allUsers.filter((user) => {
    if (targetType === 'all') return true;

    const userGroupIds = user.groups ? user.groups.map((g) => g.id) : [];

    if (targetType === 'roles' && targetRoles) {
      return targetRoles.some((role) => {
        const allowedIds = ROLE_GROUP_IDS[role as Roles];
        return allowedIds.some((id) => userGroupIds.includes(id));
      });
    }

    if (targetType === 'cevi_groups' && targetCeviGroups) {
      return targetCeviGroups.some((tg) => userGroupIds.includes(tg.groupId));
    }

    return false;
  });

  const eligibleUserUuids = new Set(matchingUsers.map((u) => u.id));

  // 3. Fetch existing PostgreSQL memberships for this chat
  const existingMemberships = await prisma.chatMembership.findMany({
    where: { chatId: chatUuid },
  });

  const existingUserUuids = new Set(existingMemberships.map((m) => m.userId));

  // 4. Add missing members as GUEST
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

  // 5. Remove users who are no longer eligible (excluding OWNER/ADMIN)
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
  }
};

const afterChannelChange: CollectionAfterChangeHook<AnnouncementChannel> = async ({
  doc,
  req: request,
  operation,
}) => {
  const name = doc.name;
  const description = doc.description;
  const targetType = doc.targetType;
  const targetRoles = doc.targetRoles;
  const targetCeviGroups = doc.targetCeviGroups;
  let chatUuid = doc.chatUuid;

  const currentAdminUuid = request.user?.id;

  if (operation === 'create' || chatUuid === undefined || chatUuid === null || chatUuid === '') {
    // A. CREATE: Set up PostgreSQL Chat & default Owner/Admin
    const newChat = await prisma.chat.create({
      data: {
        name: name,
        description: description ?? '',
        type: ChatType.ANNOUNCEMENT,
        status: ChatStatus.OPEN,
        capabilities: [ChatCapability.CAN_SEND_MESSAGES, ChatCapability.THREADS],
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
    });
  } else {
    // B. UPDATE: Reconcile Chat details in PostgreSQL
    await prisma.chat.update({
      where: { uuid: chatUuid },
      data: {
        name,
        description: description ?? '',
        lastUpdate: new Date(),
      },
    });
  }

  // C. Sync targeted GUEST memberships
  await syncAnnouncementChannelMemberships(
    chatUuid,
    targetType,
    targetRoles,
    targetCeviGroups,
    request,
  );

  return doc;
};

const afterChannelDelete: CollectionAfterDeleteHook<AnnouncementChannel> = async ({ doc }) => {
  const chatUuid = doc.chatUuid;
  if (chatUuid !== undefined && chatUuid !== null && chatUuid !== '') {
    // Delete PostgreSQL chat structure cascade-deletes memberships & messages
    await prisma.chat
      .delete({
        where: { uuid: chatUuid },
      })
      .catch((error: unknown) => {
        console.error(
          `Failed to cascade delete PostgreSQL chat ${chatUuid} on CMS channel deletion:`,
          error,
        );
      });
  }
};

export const AnnouncementChannelsCollection: CollectionConfig = {
  slug: 'announcement-channels',
  admin: {
    useAsTitle: 'name',
    group: AdminPanelDashboardGroups.AppContent,
    defaultColumns: ['name', 'targetType', 'chatUuid'],
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
  hooks: {
    afterChange: [afterChannelChange],
    afterDelete: [afterChannelDelete],
  },
  fields: [
    {
      name: 'name',
      label: {
        en: 'Channel Name',
        de: 'Kanalname',
        fr: 'Nom du canal',
      },
      type: 'text',
      required: true,
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
          label: { en: 'Specific Roles', de: 'Spezifische Rollen', fr: 'Rôles spécifiques' },
          value: 'roles',
        },
        {
          label: { en: 'CeviDB Groups', de: 'CeviDB Gruppen', fr: 'Groupes CeviDB' },
          value: 'cevi_groups',
        },
      ],
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
      options: [
        { label: 'Full Admin', value: 'full-admin' },
        { label: 'Web Core Team', value: 'web-core-team' },
        { label: 'Translation Team', value: 'translation-team' },
        { label: 'Program Team', value: 'program-team' },
      ],
      admin: {
        condition: (data) => data['targetType'] === 'roles',
      },
    },
    {
      name: 'targetCeviGroups',
      label: {
        en: 'Target CeviDB Groups',
        de: 'Ziel CeviDB-Gruppen',
        fr: 'Groupes CeviDB cibles',
      },
      type: 'array',
      admin: {
        condition: (data) => data['targetType'] === 'cevi_groups',
      },
      fields: [
        {
          name: 'groupId',
          label: { en: 'Group ID', de: 'Gruppen-ID', fr: 'ID du groupe' },
          type: 'number',
          required: true,
        },
        {
          name: 'groupName',
          label: { en: 'Group Name', de: 'Gruppenname', fr: 'Nom du groupe' },
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'chatUuid',
      label: 'Linked Chat UUID (PostgreSQL)',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
  ],
};
