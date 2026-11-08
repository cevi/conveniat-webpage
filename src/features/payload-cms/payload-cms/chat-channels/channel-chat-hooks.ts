import type { ChannelAudience } from '@/features/payload-cms/payload-cms/chat-channels/channel-audience';
import type { ChannelCollection } from '@/features/payload-cms/payload-cms/chat-channels/channel-collections';
import { syncChannelMemberships } from '@/features/payload-cms/payload-cms/chat-channels/channel-memberships';
import { type ChatCapability, ChatStatus } from '@/lib/prisma/enums';

import prisma from '@/lib/db/prisma';
import type { ChatType } from '@/lib/prisma/enums';
import { ChatMembershipPermission, MessageEventType, MessageType } from '@/lib/prisma/enums';
import type { StaticTranslationString } from '@/types/types';
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload';

/** Marks the update that only stores the id of a newly created chat. */
const CHAT_ID_WRITE_BACK = 'channelChatIdWriteBack';

/** What the hooks read off a channel document. */
export type ChannelDocument = ChannelAudience & {
  id: string;
  name: string;
  description?: string | null;
  pinned?: boolean | null;
  chatUuid?: string | null;
};

/** Deletes a channel's chat with the channel; Postgres deletes its memberships and messages. */
const deleteChannelChat: CollectionAfterDeleteHook<ChannelDocument> = async ({ doc, req }) => {
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

/** Options of `createChannelChatHooks`. */
export interface ChannelChatHooksOptions<T extends ChannelDocument> extends ChannelCollection {
  chatType: ChatType;
  /** What members may do in the chat, from the document as the editor saved it. */
  capabilities: (channel: T) => ChatCapability[];
  /** The system message a new chat opens with. */
  createdMessage: StaticTranslationString;
}

/**
 * The hooks that keep a channel's chat in Postgres in step with its document: saving creates
 * or updates the chat and reconciles its members with the audience, deleting deletes the chat.
 * The editor who creates a channel becomes the owner of its chat.
 */
export const createChannelChatHooks = <T extends ChannelDocument>({
  slug,
  chatType,
  memberPermission,
  capabilities: capabilitiesOf,
  createdMessage,
}: ChannelChatHooksOptions<T>): {
  afterChange: CollectionAfterChangeHook<T>;
  afterDelete: CollectionAfterDeleteHook<ChannelDocument>;
} => {
  const afterChange: CollectionAfterChangeHook<T> = async ({
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
    const capabilities = capabilitiesOf(doc);

    if (operation === 'create' || chatUuid === undefined || chatUuid === null || chatUuid === '') {
      // A. CREATE: Set up PostgreSQL Chat & default Owner/Admin
      const newChat = await prisma.chat.create({
        data: {
          name: name,
          description: description ?? '',
          type: chatType,
          status: ChatStatus.OPEN,
          capabilities: capabilities,
          pinned: doc.pinned === true,
          messages: {
            create: {
              contentVersions: { create: [{ payload: createdMessage }] },
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
        collection: slug,
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

    // C. Sync the memberships of the audience
    await syncChannelMemberships(request.payload, chatUuid, doc, {
      memberPermission,
      req: request,
      actorId: request.user?.id,
    });

    return doc;
  };

  return { afterChange, afterDelete: deleteChannelChat };
};
