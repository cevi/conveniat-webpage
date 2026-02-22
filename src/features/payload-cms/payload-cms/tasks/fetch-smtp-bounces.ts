import { environmentVariables } from '@/config/environment-variables';
import type { ParsedMail } from 'mailparser';
import { simpleParser } from 'mailparser';
import POP3Command from 'node-pop3';
import type { Payload, PayloadRequest, TaskConfig } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

const getOriginalEnvelopeId = (parsed: ParsedMail): string | undefined => {
  const headerValue = parsed.headers.get('original-envelope-id');

  if (headerValue !== undefined) {
    const rawValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (typeof rawValue === 'object' && 'value' in rawValue) {
      const val = (rawValue as { value?: unknown }).value;
      if (typeof val === 'string' && val.length > 0) {
        return val.trim();
      }
    } else if (typeof rawValue === 'string' && rawValue.length > 0) {
      return rawValue.trim();
    }
  }

  // Fallback to body parsing
  const text = typeof parsed.text === 'string' ? parsed.text : '';
  if (text.length > 0) {
    const match = /Original-Envelope-Id:\s*([a-zA-Z0-9]+)/i.exec(text);
    const id = match?.[1];
    if (typeof id === 'string' && id.length > 0) return id;
  }

  return undefined;
};

const determineDeliveryStatus = (parsed: ParsedMail): { isSuccess: boolean; dsnString: string } => {
  const subject = (parsed.subject ?? '').toLowerCase();
  let rawText = typeof parsed.text === 'string' ? parsed.text : '';
  if (rawText.length === 0) rawText = typeof parsed.html === 'string' ? parsed.html : '';
  if (rawText.length === 0)
    rawText = typeof parsed.textAsHtml === 'string' ? parsed.textAsHtml : '';

  const text = rawText.toLowerCase();

  const isSuccess =
    subject.includes('successful') ||
    subject.includes('delivered') ||
    text.includes('successfully delivered') ||
    text.includes('status: 2.0.0') ||
    text.includes('action: relayed') ||
    text.includes('action: delivered');

  return {
    isSuccess,
    dsnString: `Delivery Status Notification. Subject: ${parsed.subject ?? ''}.\n\nReason:\n${text.trim()}`,
  };
};

const parsePop3MessageIds = (rawResponse: unknown): number[] => {
  const messages: number[] = [];

  if (typeof rawResponse === 'string') {
    const lines = rawResponse.split('\r\n').filter(Boolean);
    for (const line of lines) {
      const parts = line.split(' ');
      const rawId = parts[0];
      if (typeof rawId === 'string') {
        const id = Number.parseInt(rawId, 10);
        if (!Number.isNaN(id)) messages.push(id);
      }
    }
  } else if (Array.isArray(rawResponse)) {
    for (const item of rawResponse as unknown[]) {
      const rawId = Array.isArray(item) ? (item[0] as unknown) : item;
      const id = Number.parseInt(String(rawId), 10);
      if (!Number.isNaN(id)) messages.push(id);
    }
  }

  return messages;
};

const updateSubmissionRecord = async (
  payload: Payload,
  envelopeId: string,
  isSuccess: boolean,
  dsnString: string,
): Promise<void> => {
  const submission = (await payload.findByID({
    collection: 'form-submissions',
    id: envelopeId,
  })) as { smtpResults?: unknown[] };

  const results = Array.isArray(submission.smtpResults) ? [...submission.smtpResults] : [];

  const newResult: Record<string, unknown> = {
    bounceReport: true,
    receivedAt: new Date().toISOString(),
    success: isSuccess,
    to: 'unknown',
  };

  if (isSuccess) {
    newResult['response'] = { response: dsnString };
  } else {
    newResult['error'] = dsnString;
  }

  results.push(newResult);

  await payload.update({
    collection: 'form-submissions',
    id: envelopeId,
    data: { smtpResults: results },
  });
};

export const fetchSmtpBouncesTask: TaskConfig<'fetchSmtpBounces'> = {
  slug: 'fetchSmtpBounces',
  retries: 0,
  schedule: [
    {
      cron: '* * * * *', // Every minute
      queue: 'default',
      hooks: {
        beforeSchedule: async ({
          queueable,
          req,
        }): Promise<{ shouldSchedule: boolean; input: Record<string, never> }> => {
          const runnableOrActiveJobsForQueue = await countRunnableOrActiveJobsForQueue({
            queue: queueable.scheduleConfig.queue,
            req,
            taskSlug: 'fetchSmtpBounces',
            onlyScheduled: true,
          });

          req.payload.logger.info(
            `Scheduler evaluated fetchSmtpBounces. Active/Runnable jobs: ${runnableOrActiveJobsForQueue}`,
          );

          // Allow up to 2 simultaneous scheduled jobs in case one gets stuck
          return {
            shouldSchedule: runnableOrActiveJobsForQueue < 2,
            input: {},
          };
        },
      },
    },
  ],
  inputSchema: [],
  handler: async ({ req }: { req: PayloadRequest }): Promise<{ output: { status: string } }> => {
    const { payload } = req;
    const { logger } = payload;
    const host =
      typeof environmentVariables.SMTP_HOST === 'string'
        ? environmentVariables.SMTP_HOST
        : undefined;
    const user =
      typeof environmentVariables.SMTP_USER === 'string'
        ? environmentVariables.SMTP_USER
        : undefined;
    const password =
      typeof environmentVariables.SMTP_PASS === 'string'
        ? environmentVariables.SMTP_PASS
        : undefined;

    if (
      host === undefined ||
      host.length === 0 ||
      user === undefined ||
      user.length === 0 ||
      password === undefined ||
      password.length === 0
    ) {
      logger.info('Skipping fetchSmtpBounces: Missing POP3/SMTP credentials.');
      return { output: { status: 'skipped' } };
    }

    const pop3 = new POP3Command({ host, port: 995, tls: true, user, password });

    try {
      const listResponseRaw = await pop3.UIDL();
      const messageIds = parsePop3MessageIds(listResponseRaw);

      if (messageIds.length === 0) {
        logger.info('No messages found in inbox while checking for bounces.');
        return { output: { status: 'empty' } };
      }

      logger.info(
        `Found ${messageIds.length} messages in inbox while checking for bounces. Processing...`,
      );

      for (const messageId of messageIds) {
        try {
          const rawEmail = await pop3.RETR(messageId);
          const parsedEmail = await simpleParser(String(rawEmail));

          const envelopeId = getOriginalEnvelopeId(parsedEmail);

          // Standard Payload ID length check (24 chars for ObjectID)
          if (envelopeId?.length === 24) {
            const { isSuccess, dsnString } = determineDeliveryStatus(parsedEmail);
            await updateSubmissionRecord(payload, envelopeId, isSuccess, dsnString);
            logger.info(`Processed bounce for submission ${envelopeId} successfully.`);
          }

          // Only delete if successfully processed or if it doesn't match our expected ID format
          await pop3.DELE(messageId);
        } catch (error: unknown) {
          // We isolate individual message failures so the loop continues
          // We DO NOT delete the message here so it can be retried on the next run
          logger.error({
            err: error,
            msg: `Failed to process message ${messageId}, leaving in inbox for retry`,
          });
        }
      }
    } catch (error: unknown) {
      logger.error({ err: error, msg: 'POP3 fetch error in fetchSmtpBounces' });
      return { output: { status: 'error' } };
    } finally {
      // Guaranteed resource cleanup, even if exceptions are thrown early
      await pop3
        .QUIT()
        .catch((error: unknown) =>
          logger.error({ err: error, msg: 'Failed to close POP3 connection safely' }),
        );
    }

    return { output: { status: 'processed' } };
  },
};
