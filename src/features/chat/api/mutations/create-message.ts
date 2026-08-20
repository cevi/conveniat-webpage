import { sendNotification } from '@/features/chat/api/utils/send-push-notifications';
import { Ability } from '@/lib/ability';
import { CapabilityAction, CapabilitySubject } from '@/lib/capabilities/types';
import { ChatCapability, LARGE_CHAT_THRESHOLD } from '@/lib/chat-shared';
import { chatPubSub } from '@/lib/db/chat-pubsub';
import {
  ChatMembershipPermission,
  ChatType,
  MessageEventType,
  MessageType,
} from '@/lib/prisma/client';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

// Zod schema for input validation
const sendMessageInputSchema = z.object({
  chatId: z.string().uuid('Invalid chat ID format.'),
  content: z
    .string()
    .min(1, 'Message content cannot be empty.')
    .max(2000, 'Message content is too long.'),
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
      invalid_type_error: 'Timestamp must be a valid date.',
    }),
  ),
  type: z.nativeEnum(MessageType).optional().default(MessageType.TEXT_MSG),
  parentId: z.string().uuid().optional(),
  quotedMessageId: z.string().uuid().optional(),
  // Client-generated identity of this message. Sending it makes the mutation idempotent:
  // a replayed send (offline outbox drain, lost response, retry) carries the same id and
  // returns the message already stored instead of creating a second one.
  // Deliberately not `.uuid()`: app versions before client-owned ids queued opaque
  // `optimistic-…` ids in their offline outbox, and rejecting those would drop the
  // queued message instead of delivering it.
  messageId: z.string().optional(),
});

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
  .use(databaseTransactionWrapper) // use a DB transaction for this mutation
  .mutation(async ({ input, ctx }) => {
    const { user, prisma } = ctx; // Destructure user and prisma from the tRPC context
    const validatedMessage = input;

    // 1. Global & Chat-specific Ability Check
    const canSend = await Ability.can(
      CapabilityAction.Send,
      CapabilitySubject.Messages,
      validatedMessage.chatId,
    );
    if (!canSend) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Messaging is disabled in this chat or globally.',
      });
    }

    if (validatedMessage.type === MessageType.IMAGE_MSG) {
      const canUpload = await Ability.can(
        CapabilityAction.Upload,
        CapabilitySubject.Images,
        validatedMessage.chatId,
      );
      if (!canUpload) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Image uploading is not enabled in this chat.',
        });
      }
    }

    if (validatedMessage.parentId) {
      const canThread = await Ability.can(
        CapabilityAction.Create,
        CapabilitySubject.Threads,
        validatedMessage.chatId,
      );
      if (!canThread) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Threading is not enabled in this chat.',
        });
      }
    }

    // 2. Validate that the user is part of the chat and has permission to send messages
    const chat = await prisma.chat.findUnique({
      where: { uuid: validatedMessage.chatId },
      select: {
        name: true,
        type: true,
        capabilities: true,
        chatMemberships: {
          select: {
            userId: true,
            chatPermission: true,
          },
        },
      },
    });

    if (
      !chat ||
      chat.chatMemberships.length === 0 ||
      !chat.chatMemberships.some((membership) => membership.userId === user.uuid)
    ) {
      console.warn(
        `User ${user.uuid} attempted to send message to chat ${validatedMessage.chatId} they are not a member of.`,
      );
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'You are not a member of this chat.',
      });
    }

    const userMembership = chat.chatMemberships.find(
      (membership) => membership.userId === user.uuid,
    );

    if (!userMembership) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'You are not a member of this chat.',
      });
    }

    if (userMembership.chatPermission === ChatMembershipPermission.GUEST) {
      // Guests can send messages ONLY if they are replying in a thread (parentId exists),
      // and BOTH THREADS and THREAD_REPLIES capabilities are enabled for this chat.
      const isThreadReply = !!validatedMessage.parentId;
      const hasThreadsCapability = chat.capabilities.includes(ChatCapability.THREADS);
      const hasThreadRepliesCapability = chat.capabilities.includes(ChatCapability.THREAD_REPLIES);

      if (!isThreadReply || !hasThreadsCapability || !hasThreadRepliesCapability) {
        console.warn(
          `User ${user.uuid} is a GUEST and attempted to send a message outside allowed thread replies context in chat ${validatedMessage.chatId}.`,
        );
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to send messages in this chat.',
        });
      }
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
        // send in *this* chat rather than an attempt to claim someone else's message.
        if (
          alreadyStored.senderId !== user.uuid ||
          alreadyStored.chatId !== validatedMessage.chatId
        ) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A different message with this ID already exists.',
          });
        }

        console.log(
          `Duplicate send for message ${clientMessageId} ignored, returning stored copy.`,
        );

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

    console.log(
      `Push notification for chat ${validatedMessage.chatId} is sent to ${user.uuid} ${JSON.stringify(
        chat.chatMemberships,
      )}`,
    );

    const recipientUserIds = chat.chatMemberships
      .filter((membership) => membership.userId !== user.uuid)
      .map((membership) => membership.userId);

    // Fetch quoted message content if quotedMessageId is provided
    let quotedSnippet: string | undefined;
    if (validatedMessage.quotedMessageId) {
      const quotedMessage = await prisma.message.findUnique({
        where: { uuid: validatedMessage.quotedMessageId },
        include: { contentVersions: { take: 1, orderBy: { revision: 'desc' } } },
      });
      if (quotedMessage?.contentVersions[0]?.payload) {
        const payload = quotedMessage.contentVersions[0].payload;
        let text: string;
        if (typeof payload === 'string') {
          text = payload;
        } else {
          const textPayload = payload as Record<string, unknown>;
          text =
            typeof textPayload['text'] === 'string' ? textPayload['text'] : JSON.stringify(payload);
        }
        quotedSnippet = text.length > 100 ? `${text.slice(0, 100)}...` : text;
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
                      quotedMessageId: validatedMessage.quotedMessageId,
                      quotedSnippet,
                    },
            },
          ],
        },
        sender: { connect: { uuid: user.uuid } },
        chat: { connect: { uuid: validatedMessage.chatId } },
        ...(validatedMessage.parentId && {
          parent: { connect: { uuid: validatedMessage.parentId } },
        }),
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

    console.log(`Message created with ID: ${createdMessage.uuid}`);

    // TODO: the following should be done asynchronously,
    //  so that the user does not have to wait for the push notification to be sent
    //  --> consider using a queue system

    // Send push notification (fire-and-forget, with error logging)
    sendNotification(
      validatedMessage.content,
      recipientUserIds,
      validatedMessage.chatId,
      createdMessage.uuid,
      {
        chatName: chat.name,
        senderName: user.name,
        // Every message in an emergency chat is part of a running alert, so the
        // follow-ups reach the piket members on the siren channel too - a reply that
        // only lands in the notification shade is exactly the failure mode the
        // emergency channel exists to prevent. Support chats stay on the regular
        // channel; they are not time critical in the same way.
        ...(chat.type === ChatType.EMERGENCY ? { notificationType: 'emergency' as const } : {}),
      },
    ).catch((error: unknown) => {
      console.error('Failed to send push notification:', error);
    });

    // Record DISTRIBUTED event after a successful notification attempt (only for chats with < LARGE_CHAT_THRESHOLD users)
    if (recipientUserIds.length < LARGE_CHAT_THRESHOLD) {
      await prisma.messageEvent.createMany({
        data: recipientUserIds.map((userId) => ({
          userId: userId,
          messageId: createdMessage.uuid,
          type: MessageEventType.DISTRIBUTED,
        })),
      });
    }

    // Publish real-time event via PostgreSQL NOTIFY (fire-and-forget)
    chatPubSub
      .publish({
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
                  quotedMessageId: validatedMessage.quotedMessageId,
                  quotedSnippet,
                },
          senderId: user.uuid,
          senderName: user.name,
          status: MessageEventType.STORED,
          type: validatedMessage.type,
          parentId: validatedMessage.parentId ?? undefined,
        },
      })
      .catch((error: unknown) => {
        console.error('Failed to publish real-time event:', error);
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
              quotedMessageId: validatedMessage.quotedMessageId,
              quotedSnippet,
            },
    };
  });
