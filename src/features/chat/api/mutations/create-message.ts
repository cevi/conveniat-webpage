import { chatError } from '@/features/chat/api/chat-errors';
import {
  assertMembershipCanWrite,
  assertWriteAbilities,
} from '@/features/chat/api/checks/assert-can-write-in-chat';
import { isTopicAdminPermission } from '@/features/chat/api/utils/topic-admins';
import { chatMessageContentSchema } from '@/features/chat/limits';
import { quotedSnippetOf } from '@/features/chat/utils/quoted-snippet';
import { Ability } from '@/lib/ability';
import { CapabilityAction, CapabilitySubject } from '@/lib/capabilities/types';
import { imageSentText, isImageKeyOfChat } from '@/lib/chat-images';
import { LARGE_CHAT_THRESHOLD } from '@/lib/chat-shared';
import { type ChatRealtimeEvent, chatPubSub } from '@/lib/db/chat-pubsub';
import poolPrisma from '@/lib/db/prisma';
import { ChatType, MessageEventType, MessageType, PushNotificationKind } from '@/lib/prisma/enums';
import { sendNotification } from '@/lib/push/send-notification';
import { invariantError } from '@/trpc/error-formatter';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { rateLimit } from '@/trpc/middleware/rate-limit';
import { createLogger } from '@/utils/server-logger';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const logger = createLogger('chat:mutations');

// Zod schema for input validation
const sendMessageInputSchema = z.object({
  chatId: z.uuid('Invalid chat ID format.'),
  content: chatMessageContentSchema,
  timestamp: z.preprocess(
    (argument) => {
      if (argument instanceof Date) {
        if (argument > new Date()) return new Date();
        return argument;
      }

      if (typeof argument === 'string' || typeof argument === 'number') {
        const date = new Date(argument);
        if (!Number.isNaN(date.getTime()) && date > new Date()) return new Date();
        return date;
      }
      return argument;
    },
    z.date({
      error: 'Timestamp must be a valid date.',
    }),
  ),
  // System and alert messages render with authority (the emergency banner, a "call this
  // number" button), so only server code creates them. Offline sends queued by older app
  // versions carry no type or TEXT_MSG, and both still pass.
  type: z
    .enum([MessageType.TEXT_MSG, MessageType.IMAGE_MSG, MessageType.LOCATION_MSG])
    .optional()
    .default(MessageType.TEXT_MSG),
  parentId: z.uuid().optional(),
  quotedMessageId: z.uuid().optional(),
  // Client-generated identity of this message. Sending it makes the mutation idempotent:
  // a replayed send (offline outbox drain, lost response, retry) carries the same id and
  // returns the message already stored instead of creating a second one.
  // Deliberately not `z.uuid()`: app versions before client-owned ids queued opaque
  // `optimistic-…` ids in their offline outbox, and rejecting those would drop the
  // queued message instead of delivering it.
  messageId: z.string().optional(),
});

/**
 * Everyone who wrote in a thread so far: the author of the message it answers and every
 * replier. A system message has no sender and adds nobody.
 */
const findThreadParticipantIds = async (chatId: string, parentId: string): Promise<string[]> => {
  const threadMessages = await poolPrisma.message.findMany({
    where: { chatId, OR: [{ uuid: parentId }, { parentId }] },
    select: { senderId: true },
    distinct: ['senderId'],
  });
  return threadMessages
    .map((message) => message.senderId)
    .filter((senderId): senderId is string => senderId !== null);
};

/**
 * Who a committed message pushes to. Runs after the commit, on the pool, so a send never
 * holds its transaction open while it reads the members of a large chat.
 *
 * A thread reply concerns the thread, not the whole chat: it pushes only to those who wrote
 * in it. Everyone else still sees it live and in the thread counter. In an announcement
 * channel guests may reply, and no reply there may wake the whole camp. A member who deleted
 * the chat never sees it in their list again, so a push for it would lead nowhere.
 */
const findPushRecipientIds = async (
  chatType: ChatType,
  chatId: string,
  senderId: string,
  parentId: string | undefined,
): Promise<string[]> => {
  if (parentId !== undefined && chatType === ChatType.ANNOUNCEMENT) return [];

  const threadParticipantIds =
    parentId === undefined ? undefined : await findThreadParticipantIds(chatId, parentId);
  if (threadParticipantIds?.length === 0) return [];

  const memberships = await poolPrisma.chatMembership.findMany({
    where: {
      chatId,
      hasDeleted: false,
      userId:
        threadParticipantIds === undefined
          ? { not: senderId }
          : { in: threadParticipantIds, not: senderId },
    },
    select: { userId: true },
  });
  return memberships.map((membership) => membership.userId);
};

const UUID_PATTERN = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

/**
 * Reads back a stored `MessageContent.payload` into the shape `sendMessage` returns.
 */
const extractMessagePayload = (
  payload: unknown,
): { text: string; quotedMessageId?: string; quotedSnippet?: string } => {
  if (typeof payload === 'string') return { text: payload };

  const record = (payload ?? {}) as Record<string, unknown>;
  const text = typeof record['text'] === 'string' ? record['text'] : JSON.stringify(payload);
  const url = typeof record['url'] === 'string' ? record['url'] : undefined;

  return {
    text: url ?? text,
    ...(typeof record['quotedMessageId'] === 'string'
      ? { quotedMessageId: record['quotedMessageId'] }
      : {}),
    ...(typeof record['quotedSnippet'] === 'string'
      ? { quotedSnippet: record['quotedSnippet'] }
      : {}),
  };
};

// tRPC router for chat-related mutations
export const createMessage = trpcBaseProcedure
  .input(sendMessageInputSchema)
  .use(
    // Every message pushes to every other member. A normal conversation stays far below
    // this, and an offline outbox that drains faster is retried once the window ends.
    rateLimit({
      name: 'chat.sendMessage',
      limit: 20,
      windowMs: 10 * 1000,
      refuse: () => chatError('TOO_MANY_REQUESTS', 'tooManyMessages'),
    }),
  )
  .use(databaseTransactionWrapper) // use a DB transaction for this mutation
  .mutation(async ({ input, ctx }) => {
    const { user, prisma } = ctx; // Destructure user and prisma from the tRPC context
    const validatedMessage = input;

    // The one read of the chat row; every check below decides on it. Only the sender's own
    // membership: the announcement channel has thousands, and a send needs none of the others
    // until after the commit, see `findPushRecipientIds`.
    const chat = await prisma.chat.findUnique({
      where: { uuid: validatedMessage.chatId },
      select: {
        name: true,
        type: true,
        capabilities: true,
        status: true,
        archivedAt: true,
        chatMemberships: {
          where: { userId: user.uuid },
          select: { userId: true, chatPermission: true },
        },
      },
    });

    // 1. Global & Chat-specific Ability Check
    await assertWriteAbilities(prisma, validatedMessage.chatId, validatedMessage.parentId, chat);

    if (validatedMessage.type === MessageType.IMAGE_MSG) {
      const canUpload = await Ability.can(
        prisma,
        CapabilityAction.Upload,
        CapabilitySubject.Images,
        validatedMessage.chatId,
        chat,
      );
      if (!canUpload) {
        // the phone's chat details said images were allowed, or an outbox replays an older send
        throw chatError('FORBIDDEN', 'imagesDisabled');
      }

      // Only an upload into this very chat, see `getUploadUrl`. Any other URL would be loaded
      // by every member's phone, which is all a tracking pixel needs.
      if (!isImageKeyOfChat(validatedMessage.content, validatedMessage.chatId)) {
        throw invariantError(
          'BAD_REQUEST',
          'An image message must name an image uploaded to this chat.',
        );
      }
    }

    // 2. Validate that the user is part of the chat and has permission to send messages.
    assertMembershipCanWrite(chat, validatedMessage.chatId, user.uuid, validatedMessage.parentId);

    // A post needs its title and row, so it is written by `forum.createForumPost`; here a forum
    // topic only takes comments. Our client never sends a post this way.
    if (chat.type === ChatType.FORUM && validatedMessage.parentId === undefined) {
      throw invariantError('BAD_REQUEST', 'A forum post is written with forum.createForumPost.');
    }
    // A private report or a post waiting for approval takes comments only from those who see
    // it; to anyone else its thread does not exist. Loaded here, so a chat send does not pull
    // in the piket schedule the check reads.
    const forumVisibility =
      chat.type === ChatType.FORUM
        ? await import('@/features/chat/api/forum/forum-visibility')
        : undefined;
    const forumThread =
      forumVisibility !== undefined && validatedMessage.parentId !== undefined
        ? await forumVisibility.findForumPostVisibility(prisma, validatedMessage.parentId)
        : undefined;
    if (
      forumVisibility !== undefined &&
      forumThread !== undefined &&
      !(await forumVisibility.canSeeForumPost(prisma, user, forumThread))
    ) {
      throw chatError('NOT_FOUND', 'threadGone');
    }

    // 3. Idempotency: adopt the client-generated id as the message id when it is a UUID.
    // A replay of the same send then hits the row that already exists and is answered with
    // it, instead of storing the message a second time and notifying everyone again.
    const clientMessageId =
      validatedMessage.messageId !== undefined && UUID_PATTERN.test(validatedMessage.messageId)
        ? validatedMessage.messageId
        : undefined;

    if (clientMessageId !== undefined) {
      // Serialise concurrent sends of the same id (two tabs draining the same offline
      // outbox). Without this both could pass the lookup below before either insert
      // commits, and the loser would fail on the primary key instead of being answered
      // with the stored message. The lock is released when this transaction ends.
      await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${clientMessageId}, 0))`;

      const alreadyStored = await prisma.message.findUnique({
        where: { uuid: clientMessageId },
        include: { contentVersions: { take: 1, orderBy: { revision: 'desc' } } },
      });

      if (alreadyStored) {
        // The id is client-chosen, so make sure it really is a replay of *this* user's
        // send in *this* chat rather than an attempt to claim someone else's message. Not an
        // invariant: outbox items queued before they carried a userId replay under whoever is
        // signed in on the phone now.
        if (
          alreadyStored.senderId !== user.uuid ||
          alreadyStored.chatId !== validatedMessage.chatId
        ) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A different message with this ID already exists.',
          });
        }

        logger.debug('Duplicate send ignored, returning the stored copy', {
          'chat.id': validatedMessage.chatId,
          'message.id': clientMessageId,
        });

        const storedPayload = extractMessagePayload(alreadyStored.contentVersions[0]?.payload);
        return {
          id: alreadyStored.uuid,
          createdAt: alreadyStored.createdAt,
          senderId: alreadyStored.senderId,
          status: MessageEventType.STORED,
          type: alreadyStored.type,
          parentId: alreadyStored.parentId ?? undefined,
          messagePayload:
            alreadyStored.type === MessageType.IMAGE_MSG
              ? { url: storedPayload.text }
              : {
                  text: storedPayload.text,
                  quotedMessageId: storedPayload.quotedMessageId,
                  quotedSnippet: storedPayload.quotedSnippet,
                },
        };
      }
    }

    // A reply belongs to a thread of this chat. Without the check, a reply to another chat's
    // message would show up in that chat's thread and be deleted along with it. A thread may
    // start at a reply or at a deleted message, and stays open for replies in both cases.
    if (validatedMessage.parentId !== undefined) {
      const parent = await prisma.message.findUnique({
        where: { uuid: validatedMessage.parentId },
        select: { chatId: true },
      });
      // unpublishing an announcement deletes its message, also under a thread still open
      if (!parent) throw chatError('NOT_FOUND', 'threadGone');
      if (parent.chatId !== validatedMessage.chatId) {
        throw invariantError('NOT_FOUND', 'Thread not found in this chat.');
      }
    }

    // A quote of another chat's message is dropped, not stored. A message deleted since (a
    // send queued offline) keeps its quote, so the reply still reads as one, but its text must
    // not come back as the snippet.
    let quotedMessageId = validatedMessage.quotedMessageId;
    let quotedSnippet: string | undefined;
    if (quotedMessageId !== undefined) {
      const quotedMessage = await prisma.message.findUnique({
        where: { uuid: quotedMessageId },
        include: { contentVersions: { take: 1, orderBy: { revision: 'desc' } } },
      });
      if (quotedMessage && quotedMessage.chatId !== validatedMessage.chatId) {
        quotedMessageId = undefined;
      } else if (quotedMessage && !quotedMessage.deletedAt) {
        quotedSnippet = quotedSnippetOf(quotedMessage.contentVersions[0]?.payload);
      }
    }

    // An image key belongs to one message. Its sender can delete the message, and a deleted
    // image is not signed again for anyone, see `getDownloadUrl`, so a resent key would let
    // a member take someone else's image away by deleting their own copy. Our client uploads
    // every image under a new key; a replay of the same send was answered above. The lock
    // keeps two sends of one key from both finding it unused.
    if (validatedMessage.type === MessageType.IMAGE_MSG) {
      await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${validatedMessage.content}, 0))`;
      const keyInUse = await prisma.messageContent.findFirst({
        where: {
          payload: { path: ['url'], equals: validatedMessage.content },
          message: { chatId: validatedMessage.chatId },
        },
        select: { uuid: true },
      });
      if (keyInUse !== null) {
        throw invariantError('CONFLICT', 'This image belongs to another message.');
      }
    }

    // Create the message and its initial events within a transaction
    const createdMessage = await prisma.message.create({
      data: {
        ...(clientMessageId === undefined ? {} : { uuid: clientMessageId }),
        type: validatedMessage.type,
        contentVersions: {
          create: [
            {
              payload:
                validatedMessage.type === MessageType.IMAGE_MSG
                  ? { url: validatedMessage.content }
                  : {
                      text: validatedMessage.content,
                      quotedMessageId,
                      quotedSnippet,
                    },
            },
          ],
        },
        // Columns, not `connect`: the parent key includes the chat, and connecting a parent
        // would take the chat from the parent instead of refusing one from another chat.
        senderId: user.uuid,
        chatId: validatedMessage.chatId,
        ...(validatedMessage.parentId !== undefined && { parentId: validatedMessage.parentId }),
        messageEvents: {
          create: [
            { type: MessageEventType.CREATED, user: { connect: { uuid: user.uuid } } },
            { type: MessageEventType.STORED },
          ],
        },
      },
    });

    await prisma.chat.update({
      where: { uuid: validatedMessage.chatId },
      data: { lastUpdate: new Date() },
    });

    // A comment on a forum post subscribes its author to the post, like writing the post does.
    // The comments of a post all answer the post itself, so the thread's parent is the post.
    const forumPost =
      chat.type === ChatType.FORUM && validatedMessage.parentId !== undefined
        ? await prisma.forumPost.findUnique({
            where: { messageId: validatedMessage.parentId },
            select: { messageId: true, title: true },
          })
        : null;
    if (forumPost !== null) {
      await prisma.threadSubscription.upsert({
        where: { userId_messageId: { userId: user.uuid, messageId: forumPost.messageId } },
        create: { userId: user.uuid, messageId: forumPost.messageId },
        update: {},
      });
    }
    // a comment by whoever handles posts is the post's reaction, which takes it out of the
    // Zentrale's queue; loaded only for a forum thread, as it reads the piket schedule
    if (forumThread !== undefined) {
      const { recordForumReaction } = await import('@/features/chat/api/forum/forum-zentrale');
      await recordForumReaction(prisma, user, forumThread);
    }

    logger.debug('Message created', {
      'chat.id': validatedMessage.chatId,
      'message.id': createdMessage.uuid,
    });

    // Record the DISTRIBUTED events, only for chats with fewer than LARGE_CHAT_THRESHOLD
    // members, the sender included, as `markChatAsRead` and `listChats` count them: a chat
    // they treat as large writes no READ events, so it must get no DISTRIBUTED ones either.
    // The read stops at the threshold, so a large chat costs no more than that.
    const members = await prisma.chatMembership.findMany({
      where: { chatId: validatedMessage.chatId },
      select: { userId: true },
      take: LARGE_CHAT_THRESHOLD,
    });
    const distributedUserIds =
      members.length < LARGE_CHAT_THRESHOLD
        ? members.map(({ userId }) => userId).filter((userId) => userId !== user.uuid)
        : [];
    if (distributedUserIds.length > 0) {
      await prisma.messageEvent.createMany({
        data: distributedUserIds.map((userId) => ({
          userId,
          messageId: createdMessage.uuid,
          type: MessageEventType.DISTRIBUTED,
        })),
      });
    }

    // Announce the message only once it is committed: a rolled-back send must not reach
    // lock screens or live views, and a client refetching on the event must find it.
    // Neither the push fan-out nor the publish is awaited, so a slow push provider does
    // not hold the request or its pool connection.
    // An image's content is its storage key, which must not reach a lock screen. The push
    // says in words who sent one, in the sender's locale like every other push, since the
    // server does not know the recipients' locales.
    const isImage = validatedMessage.type === MessageType.IMAGE_MSG;
    const pushText = isImage ? imageSentText(user.name)[ctx.locale] : validatedMessage.content;

    // a comment by the topic's Kernteam carries its badge, live as when it is read back
    const byTopicAdmin =
      chat.type === ChatType.FORUM &&
      isTopicAdminPermission(chat.chatMemberships[0]?.chatPermission);
    // the function behind the badge, for the live event, in the writer's language like a push;
    // the thread read back has it in the reader's. Loaded only then, as it reads Payload
    const kernteamLabel = byTopicAdmin
      ? await import('@/features/chat/api/forum/forum-kernteam-labels')
          .then(({ findKernteamLabelsOfTopic }) =>
            findKernteamLabelsOfTopic(prisma, validatedMessage.chatId, [user.uuid], ctx.locale),
          )
          .then((labels) => labels.get(user.uuid))
      : undefined;
    const kernteam = byTopicAdmin
      ? { byTopicAdmin, ...(kernteamLabel === undefined ? {} : { kernteamLabel }) }
      : {};

    ctx.afterTransactionCommit(() => {
      if (chat.type === ChatType.FORUM) {
        // the post's subscribers and the piket on duty, see `forum-push`
        // loaded here, so a chat send does not pull in the piket schedule it reads
        if (forumPost !== null) {
          void import('@/features/chat/api/forum/forum-push')
            .then(({ pushForumThread }) => {
              pushForumThread({
                chatId: validatedMessage.chatId,
                postId: forumPost.messageId,
                messageId: createdMessage.uuid,
                postTitle: forumPost.title,
                text: pushText,
                actorId: user.uuid,
                ...(isImage ? {} : { senderName: user.name }),
                includePiket: true,
              });
            })
            .catch((error: unknown) => {
              logger.error('Failed to load the forum push', {
                error,
                'chat.id': validatedMessage.chatId,
              });
            });
        }
      } else
        findPushRecipientIds(
          chat.type,
          validatedMessage.chatId,
          user.uuid,
          validatedMessage.parentId,
        )
          .catch((error: unknown) => {
            // the message is stored and published; only its push is lost
            logger.error('Reading the push recipients failed', {
              error,
              'chat.id': validatedMessage.chatId,
              'message.id': createdMessage.uuid,
            });
            return [];
          })
          .then(async (pushRecipientUserIds) => {
            logger.debug('Message fan-out', {
              'chat.id': validatedMessage.chatId,
              'message.id': createdMessage.uuid,
              'chat.distributed.count': distributedUserIds.length,
              'chat.push.recipient.count': pushRecipientUserIds.length,
            });
            if (pushRecipientUserIds.length === 0) return;
            await sendNotification(
              pushText,
              pushRecipientUserIds,
              validatedMessage.chatId,
              createdMessage.uuid,
              {
                kind:
                  chat.type === ChatType.EMERGENCY
                    ? PushNotificationKind.EMERGENCY
                    : PushNotificationKind.CHAT,
                chatName: chat.name,
                directChat: chat.type === ChatType.ONE_TO_ONE,
                // the image line already names the sender
                ...(isImage ? {} : { senderName: user.name }),
                // No notificationType: only the alert that opens an emergency chat sirens (see
                // the emergency router). A siren on every reply drowned out a busy case, so the
                // follow-ups ring like any chat message (#1654).
              },
            );
          })
          .catch((error: unknown) => {
            logger.error('Failed to send push notification', {
              error,
              'chat.id': validatedMessage.chatId,
              'message.id': createdMessage.uuid,
            });
          });

      const newMessageEvent: ChatRealtimeEvent = {
        type: 'new_message',
        chatId: validatedMessage.chatId,
        senderId: user.uuid,
        message: {
          id: createdMessage.uuid,
          createdAt: createdMessage.createdAt,
          messagePayload:
            validatedMessage.type === MessageType.IMAGE_MSG
              ? { url: validatedMessage.content }
              : {
                  text: validatedMessage.content,
                  quotedMessageId,
                  quotedSnippet,
                },
          senderId: user.uuid,
          senderName: user.name,
          status: MessageEventType.STORED,
          type: validatedMessage.type,
          parentId: validatedMessage.parentId ?? undefined,
          ...kernteam,
        },
      };
      // a comment of a restricted forum post goes only to those who see the post
      (forumVisibility !== undefined && forumThread !== undefined
        ? forumVisibility.publishForumThreadEvent(poolPrisma, forumThread, newMessageEvent)
        : chatPubSub.publish(newMessageEvent)
      ).catch((error: unknown) => {
        logger.error('Failed to publish the new_message real-time event', {
          error,
          'chat.id': validatedMessage.chatId,
          'message.id': createdMessage.uuid,
        });
      });
    });

    return {
      id: createdMessage.uuid,
      createdAt: createdMessage.createdAt,
      senderId: user.uuid,
      status: MessageEventType.STORED,
      type: createdMessage.type,
      parentId: validatedMessage.parentId ?? undefined,
      messagePayload:
        validatedMessage.type === MessageType.IMAGE_MSG
          ? { url: validatedMessage.content }
          : {
              text: validatedMessage.content,
              quotedMessageId,
              quotedSnippet,
            },
      ...kernteam,
    };
  });
