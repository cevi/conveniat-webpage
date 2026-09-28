import { assertChatNotArchived } from '@/features/chat/api/checks/assert-can-write-in-chat';
import { extractStringKey } from '@/features/payload-cms/payload-cms/utils/extract-string-key';
import type { AlertSetting } from '@/features/payload-cms/payload-types';
import { chatPubSub } from '@/lib/db/chat-pubsub';
import { MessageType } from '@/lib/prisma/client';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { createLogger } from '@/utils/server-logger';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const logger = createLogger('chat:mutations');

// The only edit a client may make is answering an alert question. The question, its options
// and its CMS reference are read back from the stored revision, never from the client, so
// only the answer is accepted. App versions that send the whole payload back still pass: the
// extra keys are dropped here.
const updateMessageContentSchema = z.object({
  messageId: z.string().uuid(),
  content: z.object({
    selectedOption: z.string().min(1).max(500),
    selectedOptionId: z.string().max(100).nullish(),
  }),
});

interface AlertOption {
  id: string | undefined;
  option: string;
}

/** Reads the options of a stored alert question, written as `{ id, option }` or plain strings. */
const readStoredOptions = (rawOptions: unknown): AlertOption[] =>
  (Array.isArray(rawOptions) ? (rawOptions as unknown[]) : []).flatMap((rawOption) => {
    if (typeof rawOption === 'string') return [{ id: undefined, option: rawOption }];
    if (rawOption === null || typeof rawOption !== 'object') return [];
    const record = rawOption as Record<string, unknown>;
    if (typeof record['option'] !== 'string') return [];
    return [
      { id: typeof record['id'] === 'string' ? record['id'] : undefined, option: record['option'] },
    ];
  });

export const updateMessageContent = trpcBaseProcedure
  .input(updateMessageContentSchema)
  .use(databaseTransactionWrapper)
  .mutation(async ({ input, ctx }) => {
    const { messageId, content: answer } = input;
    const { prisma, user } = ctx;

    // Serialise answers to the same question (a double tap, two devices), so the second one
    // sees the first answer and is rejected instead of sending a second follow-up. The lock
    // is released when this transaction ends.
    await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${messageId}, 0))`;

    // Fetch the message to check permissions and get current revision
    const message = await prisma.message.findUnique({
      where: { uuid: messageId },
      include: {
        contentVersions: {
          orderBy: { revision: 'desc' },
          take: 1,
        },
      },
    });

    if (!message) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Message not found' });
    }

    if (message.type !== MessageType.ALERT_QUESTION) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Only alert questions can be answered' });
    }

    // The sender of an alert question is the person who raised the alert, and only they answer.
    if (message.senderId !== user.uuid) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only answer your own alert' });
    }

    const chat = await prisma.chat.findUniqueOrThrow({
      where: { uuid: message.chatId },
      select: { archivedAt: true },
    });
    assertChatNotArchived(chat);

    const storedPayload = (message.contentVersions[0]?.payload ?? {}) as Record<string, unknown>;
    if (
      typeof storedPayload['selectedOption'] === 'string' &&
      storedPayload['selectedOption'].length > 0
    ) {
      throw new TRPCError({ code: 'CONFLICT', message: 'This question has already been answered' });
    }

    const storedOptions = readStoredOptions(storedPayload['options']);
    const answeredIndex = ((): number => {
      const byId =
        typeof answer.selectedOptionId === 'string'
          ? storedOptions.findIndex((option) => option.id === answer.selectedOptionId)
          : -1;
      return byId === -1
        ? storedOptions.findIndex((option) => option.option === answer.selectedOption)
        : byId;
    })();
    const answeredOption = storedOptions[answeredIndex];
    if (answeredOption === undefined) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'This is not an option of the question',
      });
    }

    const content = {
      ...storedPayload,
      selectedOption: answeredOption.option,
      selectedOptionId: answeredOption.id,
    };

    const currentRevision = message.contentVersions[0]?.revision ?? 0;

    await prisma.messageContent.create({
      data: {
        messageId: message.uuid,
        payload: content,
        revision: currentRevision + 1,
        messageEvents: {
          create: [], // No new events for now, or maybe UPDATED?
        },
      },
    });

    // Touch the parent chat to update lastUpdate timestamp
    await prisma.chat.update({
      where: { uuid: message.chatId },
      data: { lastUpdate: new Date() },
    });

    const { getPayload } = await import('payload');
    const config = await import('@payload-config');
    const payloadAPI = await getPayload({ config: config.default });

    const alertSettings: AlertSetting = await payloadAPI.findGlobal({
      slug: 'alert_settings',
      locale: ctx.locale,
      fallbackLocale: 'de',
    });

    const questions = alertSettings.questions ?? [];
    const currentQuestionIndex = questions.findIndex(
      (q) => q.id === storedPayload['questionRefId'],
    );

    if (currentQuestionIndex !== -1) {
      const currentQuestion = questions[currentQuestionIndex];

      // 1. Match by stable option ID
      let selectedOption =
        answeredOption.id === undefined
          ? undefined
          : currentQuestion?.options.find((opt) => opt.id === answeredOption.id);

      // 2. Match by exact option text
      selectedOption ??= currentQuestion?.options.find(
        (opt) => opt.option === answeredOption.option,
      );

      // 3. Fallback: match by option index if option text was edited in CMS
      selectedOption ??= currentQuestion?.options[answeredIndex];

      if (selectedOption === undefined) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Selected option is no longer valid for this question',
        });
      }

      const nextQuestionKeyFromOption = extractStringKey(
        (selectedOption as Record<string, unknown>)['nextQuestionKey'],
        ctx.locale,
      );

      let nextQuestion: (typeof questions)[number] | undefined;

      if (nextQuestionKeyFromOption !== undefined) {
        nextQuestion = questions.find((q) => {
          const questionKey = extractStringKey(q.key, ctx.locale);
          return questionKey?.toLowerCase() === nextQuestionKeyFromOption.toLowerCase();
        });
        if (!nextQuestion) {
          throw new Error(`Referenced next question key "${nextQuestionKeyFromOption}" not found`);
        }
      }

      // Send next question OR final response
      const createdNextMessage = await prisma.message.create({
        data: nextQuestion
          ? {
              chatId: message.chatId,
              senderId: user.uuid,
              type: MessageType.ALERT_QUESTION,
              contentVersions: {
                create: {
                  payload: {
                    question: nextQuestion.question,
                    options: nextQuestion.options.map((o) => ({
                      id: o.id,
                      option: o.option,
                    })),
                    selectedOption: undefined,
                    questionRefId: nextQuestion.id,
                  },
                  revision: 0,
                },
              },
              messageEvents: {
                create: [{ type: 'STORED' }],
              },
            }
          : {
              chatId: message.chatId,
              // senderId omitted (defaults to null/system)
              type: MessageType.ALERT_RESPONSE,
              contentVersions: {
                create: {
                  payload: {
                    message: alertSettings.finalResponseMessage,
                    phoneNumber: alertSettings.emergencyPhoneNumber,
                  },
                  revision: 0,
                },
              },
              messageEvents: {
                create: [{ type: 'STORED' }],
              },
            },
      });

      // Publish new_message event for the new question/response. Deferred until after
      // commit, so a client refetching on it finds the message.
      ctx.afterTransactionCommit(() => {
        chatPubSub
          .publish({
            type: 'new_message',
            chatId: message.chatId,
            senderId: createdNextMessage.senderId ?? '',
            message: {
              id: createdNextMessage.uuid,
              createdAt: createdNextMessage.createdAt,
              messagePayload: nextQuestion
                ? {
                    question: nextQuestion.question,
                    options: nextQuestion.options
                      .map((o) => o.option as string | undefined)
                      .filter((o): o is string => o !== undefined),
                    selectedOption: undefined,
                    questionRefId: nextQuestion.id,
                  }
                : {
                    message: alertSettings.finalResponseMessage,
                    phoneNumber: alertSettings.emergencyPhoneNumber,
                  },
              senderId: createdNextMessage.senderId ?? undefined,
              status: 'STORED',
              type: createdNextMessage.type,
            },
          })
          .catch((error: unknown) => {
            logger.error('Failed to publish the new alert message event', {
              error,
              'chat.id': message.chatId,
              'message.id': createdNextMessage.uuid,
            });
          });
      });
    }

    // Publish message_updated event for the original message once committed
    ctx.afterTransactionCommit(() => {
      chatPubSub
        .publish({
          type: 'message_updated',
          chatId: message.chatId,
          senderId: user.uuid,
          message: {
            id: message.uuid,
            createdAt: message.createdAt,
            messagePayload: content,
            senderId: message.senderId ?? undefined,
            status: 'STORED',
            type: message.type,
            parentId: message.parentId ?? undefined,
          },
        })
        .catch((error: unknown) => {
          logger.error('Failed to publish the message_updated event', {
            error,
            'chat.id': message.chatId,
            'message.id': message.uuid,
          });
        });
    });

    return { success: true };
  });
