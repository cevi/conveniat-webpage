import type { AlertSetting } from '@/features/payload-cms/payload-types';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { MessageType } from '@prisma/client';
import { z } from 'zod';

const updateMessageContentSchema = z.object({
  messageId: z.string(),
  content: z.record(z.any()), // flexible JSON payload
});

export const updateMessageContent = trpcBaseProcedure
  .input(updateMessageContentSchema)
  .use(databaseTransactionWrapper)
  .mutation(async ({ input, ctx }) => {
    const { messageId, content } = input;
    const { prisma, user } = ctx;

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
      throw new Error('Message not found');
    }

    // Check if user is the sender (for Alert Questions, the sender is the user who created the alert)
    // Or check chat permissions if needed. For now, enforcing sender is safer for this use case.
    if (message.senderId !== user.uuid) {
      throw new Error('You can only update your own messages');
    }

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

    // Check if this was an alert question being answered
    if (message.type === MessageType.ALERT_QUESTION && (content['selectedOption'] || content['selectedOptionId'])) {
      const { getPayload } = await import('payload');
      const config = await import('@payload-config');
      const payloadAPI = await getPayload({ config: config.default });

      const alertSettings: AlertSetting = await payloadAPI.findGlobal({
        slug: 'alert_settings',
        locale: ctx.locale,
        fallbackLocale: 'de',
      });

      const questions = alertSettings.questions || [];
      const currentQuestionIndex = questions.findIndex((q) => q.id === content['questionRefId']);

      if (currentQuestionIndex !== -1) {
        // Identify selected option by id if provided, otherwise try to match by label (backwards compatibility)
        const selectedOptionId = content['selectedOptionId'] ?? null;
        const selectedOptionLabel = content['selectedOption'] ?? null;

        const currentQuestion = questions[currentQuestionIndex];
        const selectedOption = (currentQuestion.options || []).find((o) => {
          if (selectedOptionId && o.id) return o.id === selectedOptionId;
          if (selectedOptionLabel) return (o.option as string | undefined) === selectedOptionLabel;
          return false;
        });

        // Resolve next question from selected option's mapping using `nextQuestionKey` (admin-provided key)
        const nextQuestionKeyFromOption = selectedOption ? (selectedOption as any).nextQuestionKey ?? null : null;

        let nextQuestion = null as any;
        if (nextQuestionKeyFromOption) {
          nextQuestion = questions.find((q: any) => q.key === nextQuestionKeyFromOption) ?? null;
        }

        // Fallback: linear progression
        if (!nextQuestion) {
          nextQuestion = questions[currentQuestionIndex + 1] ?? null;
        }

        // Send next question OR final response
        await prisma.message.create({
          data: nextQuestion
            ? {
                chatId: message.chatId,
                senderId: user.uuid,
                type: MessageType.ALERT_QUESTION,
                contentVersions: {
                  create: {
                    payload: {
                      question: nextQuestion.question,
                      // Provide option objects with ids so the UI can send back option ids
                      options: (nextQuestion.options || []).map((o: any) => ({ id: o.id ?? null, option: o.option })),
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
      }
    }

    return { success: true };
  });
