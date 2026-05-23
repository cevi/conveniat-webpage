/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { sendNotification } from '@/features/chat/api/utils/send-push-notifications';
import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { minimalEditorFeatures } from '@/features/payload-cms/payload-cms/plugins/lexical-editor';
import { asLocalizedCollection } from '@/features/payload-cms/payload-cms/utils/localized-collection';
import type { Announcement } from '@/features/payload-cms/payload-types';
import { chatPubSub } from '@/lib/db/chat-pubsub';
import prisma from '@/lib/db/prisma';
import { MessageEventType, MessageType } from '@/lib/prisma/client';
import { AlignFeature, lexicalEditor, UnorderedListFeature } from '@payloadcms/richtext-lexical';
import type { CollectionBeforeChangeHook, CollectionConfig, PayloadRequest } from 'payload';

export interface LexicalNode {
  type: string;
  text?: string;
  format?: number;
  children?: LexicalNode[];
}

export interface LexicalRichText {
  root?: LexicalNode;
}

export const serializeLexicalToMarkdown = (node: LexicalNode | null | undefined): string => {
  if (node === undefined || node === null) return '';
  if (node.type === 'text') {
    let text = node.text ?? '';
    if (node.format !== undefined && (node.format & 1) !== 0) text = `*${text}*`; // Bold
    if (node.format !== undefined && (node.format & 2) !== 0) text = `_${text}_`; // Italic
    return text;
  }
  if (node.type === 'link' || node.type === 'autolink') {
    const nodeObject = node as unknown as Record<string, unknown>;
    const fields = (nodeObject['fields'] ?? {}) as Record<string, unknown>;
    const url = (fields['url'] ?? nodeObject['url'] ?? '') as string;
    const childrenText = node.children
      ? node.children.map((child) => serializeLexicalToMarkdown(child)).join('')
      : '';
    if (url !== '') {
      if (childrenText === url) return childrenText;
      return `[${childrenText}](${url})`;
    }
    return childrenText;
  }
  if (node.children !== undefined) {
    const childrenText = node.children.map((child) => serializeLexicalToMarkdown(child)).join('');
    if (node.type === 'paragraph') return childrenText + '\n';
    if (node.type === 'listitem') return `- ${childrenText}\n`;
    return childrenText;
  }
  return '';
};

export const getLexicalText = (richText: unknown): string => {
  if (richText === undefined || richText === null || richText === '') return '';
  if (typeof richText === 'string') return richText;
  const lexicalRichText = richText as LexicalRichText;
  if (lexicalRichText.root !== undefined) {
    return serializeLexicalToMarkdown(lexicalRichText.root).trim();
  }
  return JSON.stringify(richText);
};

export const publishAnnouncementToPostgres = async (
  channelId: string,
  localizedPayload: Record<string, { text: string; title: string; body: string }>,
  authorUuid: string,
  request: PayloadRequest,
): Promise<{ messageUuid: string; publishedAt: Date }> => {
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

  const publishedAt = new Date();

  // 4. Create PostgreSQL Message
  const createdMessage = await prisma.message.create({
    data: {
      type: MessageType.TEXT_MSG,
      chatId: chatUuid,
      senderId: senderUuid,
      contentVersions: {
        create: [
          {
            payload: localizedPayload,
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
      console.error('Failed to publish announcement socket event:', error);
    });

  // 7. Trigger Native & Web Push Notifications
  const defaultText =
    localizedPayload[request.locale ?? 'de']?.text ??
    localizedPayload['de']?.text ??
    localizedPayload['en']?.text ??
    '';
  if (recipientUserIds.length > 0 && defaultText !== '') {
    sendNotification(defaultText, recipientUserIds, chatUuid, createdMessage.uuid).catch(
      (error: unknown) => {
        console.error('Failed to send push notifications for announcement:', error);
      },
    );
  }

  return { messageUuid: createdMessage.uuid, publishedAt };
};

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

  const locale = request.locale ?? 'de';
  const dataAsRecord = data as Record<string, unknown>;

  // Payload CMS creates draft versions on auto-save or when explicitly saving a draft.
  // We must not push these draft changes to PostgreSQL. The live chat feed should
  // only be updated when the user explicitly triggers a publish or unpublish action.
  const internalStatus = dataAsRecord['_status'];
  if (internalStatus === 'draft') {
    return data;
  }

  const localizedStatus = dataAsRecord['_localized_status'] as Record<string, unknown> | undefined;
  const isPublished = localizedStatus?.['published'] === true;

  if (isPublished) {
    if (data.status === 'scheduled') {
      // The user clicked publish, but wants it SCHEDULED.
      // Do not push to Postgres yet; the cron job will handle it at the right time.
      return data;
    }

    // Automatically sync the overall document status dropdown to 'published'
    data.status = 'published';

    try {
      const authorUuid = (data.author as string | undefined) ?? request.user?.id;
      if (authorUuid === undefined || authorUuid === '') {
        throw new Error('No author identified for the announcement.');
      }

      const channelId = typeof data.channel === 'string' ? data.channel : (data.channel?.id ?? '');
      if (channelId === '') {
        throw new Error('No channel selected for the announcement.');
      }

      // 1. Fetch the full document with all locales to get all translations
      let documentAll: Record<string, Record<string, unknown>> | undefined;
      if (originalDoc?.id !== undefined) {
        const fetchedDocument = await request.payload.findByID({
          collection: 'announcements',
          id: originalDoc.id,
          locale: 'all',
          draft: true,
        });
        documentAll = fetchedDocument as unknown as Record<string, Record<string, unknown>>;
      }

      // 2. Build the localized payload for all locales
      const localizedPayload: Record<string, { text: string; title: string; body: string }> = {};
      for (const lang of ['de', 'en', 'fr']) {
        const documentTitle = documentAll?.['title'] as Record<string, string> | undefined;
        const documentContent = documentAll?.['content'];

        const title = (lang === locale ? data.title : undefined) ?? documentTitle?.[lang] ?? '';
        const content = (lang === locale ? data.content : undefined) ?? documentContent?.[lang];
        if (title !== '' || content !== undefined) {
          const formattedContent = getLexicalText(content);
          const fullTextContent = `*${title}*\n\n${formattedContent}`;
          localizedPayload[lang] = {
            text: fullTextContent,
            title: title,
            body: formattedContent,
          };
        }
      }

      const chatMessageUuid = data.chatMessageUuid ?? originalDoc?.chatMessageUuid;

      if (chatMessageUuid !== undefined && chatMessageUuid !== null && chatMessageUuid !== '') {
        // A. UPDATE / REVISION
        // Query the latest revision payload from PostgreSQL to check for changes
        const latestRevision = await prisma.messageContent.findFirst({
          where: { messageId: chatMessageUuid },
          orderBy: { revision: 'desc' },
          select: { payload: true },
        });

        let hasChanges = false;
        if (latestRevision !== null && latestRevision.payload !== null) {
          const previousPayload = latestRevision.payload as Record<string, unknown>;
          hasChanges = JSON.stringify(previousPayload) !== JSON.stringify(localizedPayload);
        } else {
          hasChanges = true;
        }

        if (hasChanges) {
          // 1. Query the existing maximum revision
          const maxRevisionContent = await prisma.messageContent.findFirst({
            where: { messageId: chatMessageUuid },
            orderBy: { revision: 'desc' },
            select: { revision: true },
          });
          const nextRevision = (maxRevisionContent?.revision ?? 0) + 1;

          // 2. Insert the new revision into PostgreSQL
          await prisma.messageContent.create({
            data: {
              messageId: chatMessageUuid,
              revision: nextRevision,
              payload: localizedPayload,
            },
          });

          // 3. Fetch message details to update chat lastUpdate and push socket event
          const existingMessage = await prisma.message.findUnique({
            where: { uuid: chatMessageUuid },
            select: { chatId: true, senderId: true },
          });

          if (existingMessage !== null) {
            const chatUuid = existingMessage.chatId;
            const senderUuid = existingMessage.senderId ?? request.user?.id ?? '';

            // Update chat lastUpdate
            await prisma.chat.update({
              where: { uuid: chatUuid },
              data: { lastUpdate: new Date() },
            });

            // Publish message_updated event to all socket listeners
            chatPubSub
              .publish({
                type: 'message_updated',
                chatId: chatUuid,
                senderId: senderUuid,
                message: {
                  id: chatMessageUuid,
                  createdAt: new Date(),
                  messagePayload: localizedPayload,
                  senderId: senderUuid,
                  status: MessageEventType.STORED,
                  type: MessageType.TEXT_MSG,
                  parentId: undefined,
                },
              })
              .catch((error: unknown) => {
                console.error('Failed to publish real-time message_updated event:', error);
              });
          }
        }
      } else {
        // B. CREATE / INITIAL PUBLISH
        const { messageUuid, publishedAt } = await publishAnnouncementToPostgres(
          channelId,
          localizedPayload,
          authorUuid,
          request,
        );

        data.chatMessageUuid = messageUuid;
        data.publishedAt = publishedAt.toISOString();
      }
    } catch (error: unknown) {
      console.error('Error publishing announcement:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Publish failed: ${errorMessage}`);
    }
  } else {
    const chatMessageUuid = data.chatMessageUuid ?? originalDoc?.chatMessageUuid;
    if (chatMessageUuid !== undefined && chatMessageUuid !== null && chatMessageUuid !== '') {
      let hasAnyPublishedLocale = false;
      if (originalDoc?.id !== undefined) {
        try {
          const fetchedDocument = await request.payload.findByID({
            collection: 'announcements',
            id: originalDoc.id,
            locale: 'all',
            draft: true,
          });
          const allLocalizedStatus = fetchedDocument['_localized_status'] as
            | Record<string, { published?: boolean }>
            | undefined;
          if (allLocalizedStatus !== undefined) {
            for (const lang of ['de', 'en', 'fr']) {
              if (lang !== locale && allLocalizedStatus[lang]?.published === true) {
                hasAnyPublishedLocale = true;
              }
            }
          }
        } catch (error: unknown) {
          console.error('Error fetching document status on unpublish:', error);
        }
      }

      if (hasAnyPublishedLocale === false) {
        try {
          await prisma.message.delete({
            where: { uuid: chatMessageUuid },
          });
        } catch (error: unknown) {
          console.error('Failed to delete postgres message on unpublish:', error);
        }
        // eslint-disable-next-line unicorn/no-null
        data.chatMessageUuid = null;
        // eslint-disable-next-line unicorn/no-null
        data.publishedAt = null;
      } else {
        const latestRevision = await prisma.messageContent.findFirst({
          where: { messageId: chatMessageUuid },
          orderBy: { revision: 'desc' },
        });

        if (latestRevision !== null && latestRevision.payload !== null) {
          const previousPayload = latestRevision.payload as Record<string, unknown>;
          const updatedPayload = { ...previousPayload };
          delete updatedPayload[locale];

          const maxRevisionContent = await prisma.messageContent.findFirst({
            where: { messageId: chatMessageUuid },
            orderBy: { revision: 'desc' },
            select: { revision: true },
          });
          const nextRevision = (maxRevisionContent?.revision ?? 0) + 1;

          await prisma.messageContent.create({
            data: {
              messageId: chatMessageUuid,
              revision: nextRevision,
              payload: updatedPayload as unknown as Parameters<
                typeof prisma.messageContent.create
              >[0]['data']['payload'],
            },
          });
        }
      }
    }
  }

  return data;
};

export const AnnouncementsCollection: CollectionConfig = asLocalizedCollection({
  slug: 'announcements',
  admin: {
    useAsTitle: 'title',
    group: AdminPanelDashboardGroups.AppContent,
    defaultColumns: ['title', 'channel', 'status', 'scheduledAt', 'publishedAt'],
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
    beforeChange: [beforeAnnouncementChange],
  },
  fields: [
    {
      name: 'title',
      label: {
        en: 'Title',
        de: 'Titel',
        fr: 'Titre',
      },
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'content',
      label: {
        en: 'Announcement Body',
        de: 'Ankündigungstext',
        fr: "Texte de l'annonce",
      },
      type: 'richText',
      required: true,
      localized: true,
      editor: lexicalEditor({
        features: [...minimalEditorFeatures, UnorderedListFeature(), AlignFeature()],
      }),
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
          timeInterval: 5,
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
        date: {
          pickerAppearance: 'dayAndTime',
          timeInterval: 5,
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
      label: 'Linked Message UUID (PostgreSQL)',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
  ],
});
