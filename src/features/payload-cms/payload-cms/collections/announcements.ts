import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { translateAnnouncementHandler } from '@/features/payload-cms/payload-cms/endpoints/translate-announcement';
import type { LocaleCode } from '@/features/payload-cms/payload-cms/locales';
import { enabledLocales, LOCALE, locales } from '@/features/payload-cms/payload-cms/locales';
import { minimalEditorFeatures } from '@/features/payload-cms/payload-cms/plugins/lexical-editor';
import type { AnnouncementLocalePayload } from '@/features/payload-cms/payload-cms/utils/announcement-message-payload';
import { buildAnnouncementMessagePayload } from '@/features/payload-cms/payload-cms/utils/announcement-message-payload';
import type { Announcement } from '@/features/payload-cms/payload-types';
import { chatPubSub } from '@/lib/db/chat-pubsub';
import prisma from '@/lib/db/prisma';
import { MessageEventType, MessageType, PushNotificationKind } from '@/lib/prisma/client';
import { sendNotification, updateAnnouncementNotification } from '@/lib/push/send-notification';
import { AlignFeature, lexicalEditor, UnorderedListFeature } from '@payloadcms/richtext-lexical';
import { randomUUID } from 'node:crypto';
import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeOperationHook,
  CollectionConfig,
  PayloadRequest,
} from 'payload';

/**
 * Prisma's `InputJsonValue` only accepts types that carry an implicit index signature,
 * which an interface does not have. The announcement payload is plain JSON, so writing it
 * through this alias is safe.
 */
type PrismaJsonPayload = Parameters<typeof prisma.messageContent.create>[0]['data']['payload'];

/**
 * One push goes out to everyone, so it carries German, the one language every published
 * announcement has.
 */
const pushTextOf = (localizedPayload: Record<string, AnnouncementLocalePayload>): string =>
  localizedPayload['de']?.text ?? Object.values(localizedPayload)[0]?.text ?? '';

interface PublishAnnouncementArguments {
  /** The id reserved for the message when the announcement was published. */
  messageUuid: string;
  channelId: string;
  localizedPayload: Record<string, AnnouncementLocalePayload>;
  authorUuid: string;
  publishedAt: Date;
  request: PayloadRequest;
}

/** Posts a published announcement into its channel and sends the push to its members. */
const publishAnnouncementToPostgres = async ({
  messageUuid,
  channelId,
  localizedPayload,
  authorUuid,
  publishedAt,
  request,
}: PublishAnnouncementArguments): Promise<void> => {
  // 1. Fetch channel details to get PostgreSQL chatUuid
  const channel = await request.payload.findByID({
    collection: 'announcement-channels',
    id: channelId,
    depth: 0,
  });

  const chatUuid = channel.chatUuid;
  if (chatUuid === undefined || chatUuid === null || chatUuid === '') {
    throw new Error('This channel is not correctly synced with PostgreSQL yet.');
  }

  // 2. Retrieve chat memberships to notify
  const chatMemberships = await prisma.chatMembership.findMany({
    where: { chatId: chatUuid },
  });

  const recipientUserIds = chatMemberships
    .filter((m) => m.userId !== authorUuid)
    .map((m) => m.userId);

  // 3. Determine a valid sender UUID in PostgreSQL (fallback to any owner or member if author is not in db)
  let senderUuid = authorUuid;
  const isAuthorInChat = chatMemberships.some((m) => m.userId === authorUuid);
  if (!isAuthorInChat && chatMemberships.length > 0) {
    senderUuid = chatMemberships[0]?.userId ?? authorUuid;
  }

  // 4. Create PostgreSQL Message
  const createdMessage = await prisma.message.create({
    data: {
      uuid: messageUuid,
      type: MessageType.TEXT_MSG,
      chatId: chatUuid,
      senderId: senderUuid,
      contentVersions: {
        create: [
          {
            payload: localizedPayload as unknown as PrismaJsonPayload,
          },
        ],
      },
      messageEvents: {
        create: [
          { type: MessageEventType.CREATED, userId: senderUuid },
          { type: MessageEventType.STORED },
        ],
      },
      createdAt: publishedAt,
    },
  });

  // 5. Update PostgreSQL Chat lastUpdate
  await prisma.chat.update({
    where: { uuid: chatUuid },
    data: { lastUpdate: publishedAt },
  });

  // 6. Publish real-time event to socket
  chatPubSub
    .publish({
      type: 'new_message',
      chatId: chatUuid,
      senderId: senderUuid,
      message: {
        id: createdMessage.uuid,
        createdAt: createdMessage.createdAt,
        messagePayload: localizedPayload,
        senderId: senderUuid,
        status: MessageEventType.STORED,
        type: MessageType.TEXT_MSG,
        parentId: undefined,
      },
    })
    .catch((error: unknown) => {
      request.payload.logger.error(
        { error, 'chat.id': chatUuid, 'message.id': createdMessage.uuid },
        'Failed to publish the announcement real-time event',
      );
    });

  // 7. Trigger Native & Web Push Notifications
  const defaultText = pushTextOf(localizedPayload);
  if (recipientUserIds.length > 0 && defaultText !== '') {
    sendNotification(defaultText, recipientUserIds, chatUuid, createdMessage.uuid, {
      kind: PushNotificationKind.ANNOUNCEMENT,
    }).catch((error: unknown) => {
      request.payload.logger.error(
        { error, 'chat.id': chatUuid, 'message.id': createdMessage.uuid },
        'Failed to send the push notifications for an announcement',
      );
    });
  }
};

/** The `req.context` key under which {@link rememberDraftSave} records the `draft` flag. */
const IS_DRAFT_SAVE = 'announcementIsDraftSave';

/**
 * Saving a draft and unpublishing both reach `beforeChange` as `_status: 'draft'`. Only
 * the operation's `draft` argument tells them apart, and `beforeOperation` is the last
 * hook that sees it. Autosave fires every second while an editor types, so mistaking it
 * for an unpublish would delete the chat message of a published announcement.
 */
const rememberDraftSave: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation === 'create' || operation === 'update') {
    req.context[IS_DRAFT_SAVE] = 'draft' in args && args.draft === true;
  }
  return args;
};

/**
 * Adds the current content of an announcement as a new revision of its chat message, and
 * puts the new text into the push its readers still have on screen.
 */
const reviseAnnouncementMessage = async (
  chatMessage: { uuid: string; chatId: string; senderId: string | null },
  localizedPayload: Record<string, AnnouncementLocalePayload>,
  authorUuid: string,
  request: PayloadRequest,
): Promise<void> => {
  const latestRevision = await prisma.messageContent.findFirst({
    where: { messageId: chatMessage.uuid },
    orderBy: { revision: 'desc' },
    select: { payload: true, revision: true },
  });

  if (
    latestRevision !== null &&
    JSON.stringify(latestRevision.payload) === JSON.stringify(localizedPayload)
  ) {
    return;
  }

  await prisma.messageContent.create({
    data: {
      messageId: chatMessage.uuid,
      revision: (latestRevision?.revision ?? 0) + 1,
      payload: localizedPayload as unknown as PrismaJsonPayload,
    },
  });

  const senderUuid = chatMessage.senderId ?? request.user?.id ?? '';

  await prisma.chat.update({
    where: { uuid: chatMessage.chatId },
    data: { lastUpdate: new Date() },
  });

  chatPubSub
    .publish({
      type: 'message_updated',
      chatId: chatMessage.chatId,
      senderId: senderUuid,
      message: {
        id: chatMessage.uuid,
        createdAt: new Date(),
        messagePayload: localizedPayload,
        senderId: senderUuid,
        status: MessageEventType.STORED,
        type: MessageType.TEXT_MSG,
        parentId: undefined,
      },
    })
    .catch((error: unknown) => {
      request.payload.logger.error(
        { error, 'message.id': chatMessage.uuid },
        'Failed to publish the message_updated event for an announcement',
      );
    });

  // A reader who has not dismissed the push yet sees the corrected text in it, without
  // being alerted a second time. A change to a translation or an image leaves the German
  // push text as it was and needs no update.
  const updatedText = pushTextOf(localizedPayload);
  const previousText =
    latestRevision === null
      ? ''
      : pushTextOf(latestRevision.payload as unknown as Record<string, AnnouncementLocalePayload>);
  if (updatedText === '' || updatedText === previousText) return;

  const chatMemberships = await prisma.chatMembership.findMany({
    where: { chatId: chatMessage.chatId },
    select: { userId: true },
  });
  const recipientUserIds = chatMemberships
    .map((membership) => membership.userId)
    .filter((userId) => userId !== authorUuid);
  updateAnnouncementNotification(
    updatedText,
    recipientUserIds,
    chatMessage.chatId,
    chatMessage.uuid,
  ).catch((error: unknown) => {
    request.payload.logger.error(
      { error, 'chat.id': chatMessage.chatId, 'message.id': chatMessage.uuid },
      'Failed to update the push notifications for an announcement',
    );
  });
};

/** The id of a relationship value, whether Payload populated it or not. */
const relationId = (value: string | { id: string } | null | undefined): string | undefined =>
  typeof value === 'string' ? value : value?.id;

/**
 * Mirrors the publishing state of an announcement into the chat.
 *
 * Every language lives on the same document, so one publish sends one chat message and
 * one push that already carry every translation. Publishing again after an edit adds a
 * revision to that message and quietly updates the push where it is still on screen,
 * without a second alert; unpublishing deletes it.
 *
 * Publishing only reserves the message id and leaves the sending to
 * {@link afterAnnouncementChange}: Payload validates the document after `beforeChange`,
 * and a push cannot be taken back when that validation or the save fails.
 */
const beforeAnnouncementChange: CollectionBeforeChangeHook<Announcement> = async ({
  data,
  req: request,
  operation,
  originalDoc,
}) => {
  // Capture the creator user
  if (
    operation === 'create' &&
    request.user !== null &&
    (data.author === undefined || data.author === null)
  ) {
    data.author = request.user.id;
  }

  if (data._status === 'published') {
    if (data.status === 'scheduled') {
      // The user clicked publish, but wants it SCHEDULED.
      // Do not push to Postgres yet; the cron job will handle it at the right time.
      return data;
    }

    // Automatically sync the overall document status dropdown to 'published'
    data.status = 'published';

    // Only reserve the message here. Payload validates and saves the document after this
    // hook, so the message and its push go out in `afterAnnouncementChange`.
    const chatMessageUuid = data.chatMessageUuid ?? originalDoc?.chatMessageUuid;
    if (chatMessageUuid === undefined || chatMessageUuid === null || chatMessageUuid === '') {
      data.chatMessageUuid = randomUUID();
      data.publishedAt = new Date().toISOString();
    }
    return data;
  }

  if (data._status === 'draft' && request.context[IS_DRAFT_SAVE] !== true) {
    // Unpublish: take the announcement out of the chat again.
    const chatMessageUuid = data.chatMessageUuid ?? originalDoc?.chatMessageUuid;
    if (chatMessageUuid !== undefined && chatMessageUuid !== null && chatMessageUuid !== '') {
      try {
        await prisma.message.delete({
          where: { uuid: chatMessageUuid },
        });
      } catch (error: unknown) {
        request.payload.logger.error(
          { error, 'message.id': chatMessageUuid },
          'Failed to delete the postgres message on unpublish',
        );
      }
      // eslint-disable-next-line unicorn/no-null
      data.chatMessageUuid = null;
      // eslint-disable-next-line unicorn/no-null
      data.publishedAt = null;
    }
  }

  return data;
};

/**
 * Sends the chat message of a published announcement once Payload has validated and saved
 * it, or adds a revision to the message that is already there.
 *
 * A message id on the document with no message behind it is a publish that has not reached
 * the chat yet, for example because the channel was not synced: publishing again sends it.
 */
const afterAnnouncementChange: CollectionAfterChangeHook<Announcement> = async ({
  doc,
  req: request,
}) => {
  const chatMessageUuid = doc.chatMessageUuid;
  if (
    doc._status !== 'published' ||
    doc.status !== 'published' ||
    chatMessageUuid === undefined ||
    chatMessageUuid === null ||
    chatMessageUuid === ''
  ) {
    return doc;
  }

  try {
    const localizedPayload = await buildAnnouncementMessagePayload({
      payload: request.payload,
      announcement: doc,
      imageReferences: doc.images,
    });

    const chatMessage = await prisma.message.findUnique({
      where: { uuid: chatMessageUuid },
      select: { uuid: true, chatId: true, senderId: true },
    });

    if (chatMessage !== null) {
      await reviseAnnouncementMessage(
        chatMessage,
        localizedPayload,
        relationId(doc.author) ?? request.user?.id ?? '',
        request,
      );
      return doc;
    }

    await publishAnnouncementToPostgres({
      messageUuid: chatMessageUuid,
      channelId: relationId(doc.channel) ?? '',
      localizedPayload,
      authorUuid: relationId(doc.author) ?? request.user?.id ?? '',
      publishedAt: new Date(doc.publishedAt ?? Date.now()),
      request,
    });
  } catch (error: unknown) {
    request.payload.logger.error(
      { error, 'message.id': chatMessageUuid },
      'Failed to publish an announcement',
    );
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Publish failed: ${errorMessage}`);
  }

  return doc;
};

/** The label of a language, as the admin panel's locale switcher shows it. */
const languageLabel = (code: LocaleCode): Record<string, string> | string =>
  locales.find((locale) => locale.code === code)?.label ?? code;

const germanTitle = (siblingData: Partial<Announcement>): string | undefined =>
  siblingData.title?.de ?? undefined;

/**
 * An announcement is not a localized collection: all languages sit on the same document
 * and are published together. Publishing one locale at a time sent the push with only
 * the first language, before the others were ready.
 *
 * `title` and `content` are groups with one sub-field per language. Mongo stores them as
 * `{ de, fr, en }`, exactly like the localized fields they replace, so announcements
 * written before the change read unchanged.
 */
export const AnnouncementsCollection: CollectionConfig = {
  slug: 'announcements',
  admin: {
    useAsTitle: 'displayTitle',
    group: AdminPanelDashboardGroups.AppContent.label,
    defaultColumns: ['displayTitle', 'channel', 'status', 'scheduledAt', 'publishedAt'],
    components: {
      edit: {
        beforeDocumentControls: [
          '@/features/payload-cms/payload-cms/components/live-preview-restorer',
        ],
      },
    },
  },
  labels: {
    singular: {
      en: 'Announcement',
      de: 'Ankündigung',
      fr: 'Annonce',
    },
    plural: {
      en: 'Announcements',
      de: 'Ankündigungen',
      fr: 'Annonces',
    },
  },
  access: {
    read: hasAdminOrWebAccess,
    create: hasAdminOrWebAccess,
    update: hasAdminOrWebAccess,
    delete: hasAdminOrWebAccess,
  },
  hooks: {
    beforeOperation: [rememberDraftSave],
    beforeChange: [beforeAnnouncementChange],
    afterChange: [afterAnnouncementChange],
  },
  endpoints: [
    {
      path: '/translate',
      method: 'post',
      handler: translateAnnouncementHandler,
    },
  ],
  versions: {
    maxPerDoc: 100,
    drafts: {
      autosave: {
        interval: 1000,
      },
    },
  },
  fields: [
    {
      name: 'pushSummary',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/announcement-push-summary#AnnouncementPushSummaryField',
        },
        disableListColumn: true,
      },
    },
    {
      // `useAsTitle` has to name a top-level field, and the title is one field per language.
      name: 'displayTitle',
      label: {
        en: 'Title',
        de: 'Titel',
        fr: 'Titre',
      },
      type: 'text',
      admin: {
        readOnly: true,
        condition: () => false,
      },
      hooks: {
        beforeChange: [({ siblingData }): string | undefined => germanTitle(siblingData)],
        // Announcements saved before this field existed have no stored value yet.
        afterRead: [
          ({ value, siblingData }): string | undefined =>
            (value as string | undefined) ?? germanTitle(siblingData),
        ],
      },
    },
    {
      name: 'translateMissingLanguages',
      type: 'ui',
      admin: {
        components: {
          Field: {
            path: '@/features/payload-cms/payload-cms/components/announcement-translate-missing-languages#AnnouncementTranslateMissingLanguages',
            clientProps: {
              targetLocales: enabledLocales.filter((locale) => locale !== LOCALE.DE),
            },
          },
        },
        disableListColumn: true,
      },
    },
    {
      name: 'title',
      label: {
        en: 'Title',
        de: 'Titel',
        fr: 'Titre',
      },
      type: 'group',
      admin: {
        description: {
          en: 'German is required. A language left empty is shown in another language in the app.',
          de: 'Deutsch ist Pflicht. Eine leer gelassene Sprache wird in der App in einer anderen Sprache angezeigt.',
          fr: "L'allemand est obligatoire. Une langue laissée vide s'affiche dans une autre langue dans l'app.",
        },
      },
      fields: enabledLocales.map((code) => ({
        name: code,
        label: languageLabel(code),
        type: 'text',
        required: code === LOCALE.DE,
      })),
    },
    {
      name: 'content',
      label: {
        en: 'Announcement Body',
        de: 'Ankündigungstext',
        fr: "Texte de l'annonce",
      },
      type: 'group',
      fields: enabledLocales.map((code) => ({
        name: code,
        label: languageLabel(code),
        type: 'richText',
        required: code === LOCALE.DE,
        editor: lexicalEditor({
          features: [...minimalEditorFeatures, UnorderedListFeature(), AlignFeature()],
        }),
      })),
    },
    {
      name: 'images',
      label: {
        en: 'Attached Images',
        de: 'Angehängte Bilder',
        fr: 'Images jointes',
      },
      type: 'relationship',
      relationTo: 'images',
      hasMany: true,
      // The images are shared by every translation of the announcement; their alt text
      // and caption are maintained per language on the image document itself.
      admin: {
        description: {
          en: 'These images are sent along with the announcement into the chat.',
          de: 'Diese Bilder werden zusammen mit der Ankündigung in den Chat geschickt.',
          fr: "Ces images sont envoyées dans le chat avec l'annonce.",
        },
      },
    },
    {
      name: 'channel',
      label: {
        en: 'Target Channel',
        de: 'Zielkanal',
        fr: 'Canal cible',
      },
      type: 'relationship',
      relationTo: 'announcement-channels',
      required: true,
    },
    {
      name: 'status',
      label: {
        en: 'Publishing Method',
        de: 'Veröffentlichungsart',
        fr: 'Méthode de publication',
      },
      type: 'select',
      required: true,
      defaultValue: 'published',
      options: [
        { label: { en: 'Scheduled', de: 'Geplant', fr: 'Planifié' }, value: 'scheduled' },
        {
          label: {
            en: 'Immediately Published',
            de: 'Sofort veröffentlicht',
            fr: 'Publié immédiatement',
          },
          value: 'published',
        },
      ],
    },
    {
      name: 'scheduledAt',
      label: {
        en: 'Schedule Publication Time',
        de: 'Geplante Veröffentlichungszeit',
        fr: 'Heure de publication planifiée',
      },
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
          timeIntervals: 5,
        },
        condition: (data) => data['status'] === 'scheduled',
      },
    },
    {
      name: 'publishedAt',
      label: {
        en: 'Actual Publication Time',
        de: 'Tatsächliche Veröffentlichungszeit',
        fr: 'Heure de publication réelle',
      },
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
          timeIntervals: 5,
        },
      },
    },
    {
      name: 'author',
      label: {
        en: 'Author (User)',
        de: 'Autor (Benutzer)',
        fr: 'Auteur (Utilisateur)',
      },
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'chatMessageUuid',
      label: {
        en: 'Chat message ID',
        de: 'Chat-Nachrichten-ID',
        fr: 'ID du message de chat',
      },
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
  ],
};
