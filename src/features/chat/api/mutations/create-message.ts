import { sendNotification } from '@/features/chat/api/utils/send-push-notifications';
import { Ability } from '@/lib/ability';
import { CapabilityAction, CapabilitySubject } from '@/lib/capabilities/types';
import { ChatMembershipPermission, MessageEventType, MessageType } from '@/lib/prisma/client';
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
});

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
      select: { chatMemberships: true },
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
    if (!userMembership || userMembership.chatPermission === ChatMembershipPermission.GUEST) {
      console.warn(
        `User ${user.uuid} does not have permission to send messages in chat ${validatedMessage.chatId}. The user has permission: ${userMembership?.chatPermission}.`,
      );
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to send messages in this chat.',
      });
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
    ).catch((error: unknown) => {
      console.error('Failed to send push notification:', error);
    });

    // Record DISTRIBUTED event after a successful notification attempt
    await prisma.messageEvent.createMany({
      data: recipientUserIds.map((userId) => ({
        userId: userId,
        messageId: createdMessage.uuid,
        type: MessageEventType.DISTRIBUTED,
      })),
    });
  });
