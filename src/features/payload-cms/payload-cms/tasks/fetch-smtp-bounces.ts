import { environmentVariables } from '@/config/environment-variables';
import type { ParsedMail } from 'mailparser';
import { simpleParser } from 'mailparser';
import POP3Command from 'node-pop3';
import type { Payload, PayloadRequest, TaskConfig } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

const MAX_RAW_EMAIL_LENGTH = 20_000;
const MAX_TOTAL_DSN_EMAIL_LENGTH = 39_000;

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
    const match = /Original-Envelope-Id:\s*([a-zA-Z0-9-]+)/i.exec(text);
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

  const isFailure =
    text.includes('action: failed') ||
    subject.includes('undelivered') ||
    subject.includes('failure') ||
    subject.includes('returned to sender');

  const isSuccess =
    !isFailure &&
    (subject.includes('successful') ||
      subject.includes('delivered') ||
      text.includes('successfully delivered') ||
      text.includes('status: 2.0.0') ||
      text.includes('action: relayed') ||
      text.includes('action: delivered'));

  return {
    isSuccess,
    dsnString: `Delivery Status Notification. Subject: ${parsed.subject ?? ''}.\n\nReason:\n${rawText.trim()}`,
  };
};

const parsePop3Messages = (rawResponse: unknown): { id: number; uid: string }[] => {
  const messages: { id: number; uid: string }[] = [];

  if (typeof rawResponse === 'string') {
    const lines = rawResponse.split('\r\n').filter(Boolean);
    for (const line of lines) {
      const parts = line.split(' ');
      const rawId = parts[0];
      const uid = parts[1];
      if (typeof rawId === 'string' && typeof uid === 'string') {
        const id = Number.parseInt(rawId, 10);
        if (!Number.isNaN(id)) messages.push({ id, uid });
      }
    }
  } else if (Array.isArray(rawResponse)) {
    for (const item of rawResponse as unknown[]) {
      if (Array.isArray(item) && item.length >= 2) {
        const id = Number.parseInt(String(item[0]), 10);
        const uid = String(item[1]);
        if (!Number.isNaN(id)) messages.push({ id, uid });
      }
    }
  }

  return messages;
};

const updateTrackingRecords = async (
  payload: Payload,
  envelopeId: string,
  isSuccess: boolean,
  dsnString: string,
  rawEmail: string,
): Promise<boolean> => {
  let outgoingEmail:
    | { smtpResults?: unknown[]; formSubmission?: string | { id: string }; rawDsnEmail?: string }
    | undefined;

  try {
    outgoingEmail = (await payload.findByID({
      collection: 'outgoing-emails',
      id: envelopeId,
    })) as {
      smtpResults?: unknown[];
      formSubmission?: string | { id: string };
      rawDsnEmail?: string;
    };
  } catch {
    // Fail silently here, we will try form-submissions directly as a fallback
  }

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

  if (outgoingEmail === undefined) {
    // Fallback: it might be an old email tracking ID (form submission ID directly)
    try {
      const submission = (await payload.findByID({
        collection: 'form-submissions',
        id: envelopeId,
      })) as { smtpResults?: unknown[] };

      const subResults = Array.isArray(submission.smtpResults) ? [...submission.smtpResults] : [];
      subResults.push(newResult);

      await payload.update({
        collection: 'form-submissions',
        id: envelopeId,
        data: { smtpResults: subResults } as Record<string, unknown>,
      });
      return true;
    } catch {
      payload.logger.info({
        msg: `Bounce tracking ID ${envelopeId} not found, likely belongs to another instance`,
      });
      return false;
    }
  } else {
    const results = Array.isArray(outgoingEmail.smtpResults) ? [...outgoingEmail.smtpResults] : [];
    results.push(newResult);

    const currentRawEmail = String(rawEmail);
    const croppedRawEmail =
      currentRawEmail.length > MAX_RAW_EMAIL_LENGTH
        ? currentRawEmail.slice(0, MAX_RAW_EMAIL_LENGTH) + '\n... [truncated]'
        : currentRawEmail;

    let newRawDsnEmail =
      typeof outgoingEmail.rawDsnEmail === 'string' && outgoingEmail.rawDsnEmail.length > 0
        ? `${croppedRawEmail}\n\n---\n\n${outgoingEmail.rawDsnEmail}`
        : croppedRawEmail;

    if (newRawDsnEmail.length > MAX_TOTAL_DSN_EMAIL_LENGTH) {
      newRawDsnEmail =
        newRawDsnEmail.slice(0, MAX_TOTAL_DSN_EMAIL_LENGTH) + '\n... [truncated early bounces] ...';
    }

    await payload.update({
      collection: 'outgoing-emails',
      id: envelopeId,
      data: {
        smtpResults: results,
        rawSmtpResults: results,
        rawDsnEmail: newRawDsnEmail,
        deliveryStatus: isSuccess ? 'success' : 'error',
        dsnReceivedAt: new Date().toISOString(),
      },
    });

    const formSubmissionRelated = outgoingEmail.formSubmission;
    const formSubmissionId =
      typeof formSubmissionRelated === 'string'
        ? formSubmissionRelated
        : (formSubmissionRelated as { id?: string } | undefined)?.id;

    if (typeof formSubmissionId === 'string' && formSubmissionId.length > 0) {
      try {
        const submission = (await payload.findByID({
          collection: 'form-submissions',
          id: formSubmissionId,
        })) as { smtpResults?: unknown[] };

        const subResults = Array.isArray(submission.smtpResults) ? [...submission.smtpResults] : [];
        subResults.push(newResult);

        await payload.update({
          collection: 'form-submissions',
          id: formSubmissionId,
          data: { smtpResults: subResults } as Record<string, unknown>,
        });
      } catch (error: unknown) {
        payload.logger.error({
          err: error instanceof Error ? error : new Error(String(error)),
          msg: `Failed to update form-submission ${formSubmissionId} for bounce`,
        });
      }
    }
    return true;
  }
};

export const fetchSmtpBouncesTask: TaskConfig<'fetchSmtpBounces'> = {
  slug: 'fetchSmtpBounces',
  retries: 0,
  /**
   * We selectively auto-delete only the `fetchSmtpBounces` job upon successful completion
   * to keep the `payload-jobs` collection clean, as this task runs very frequently (every minute).
   * We do this here instead of using the global `deleteJobOnComplete: true` in the JobsConfig
   * to preserve the execution history and observability for other critical workflows.
   */
  onSuccess: async ({ job, req }) => {
    try {
      if ((typeof job.id === 'string' && job.id.length > 0) || typeof job.id === 'number') {
        await req.payload.delete({
          collection: 'payload-jobs',
          id: job.id,
        });
      }
    } catch (error: unknown) {
      req.payload.logger.error({
        err: error instanceof Error ? error : new Error(String(error)),
        msg: `Failed to auto-delete completed fetchSmtpBounces job: ${String(job.id)}`,
      });
    }
  },
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

          // Prevent concurrent job execution to avoid read-modify-write race conditions when updating smtpResults
          return {
            shouldSchedule: runnableOrActiveJobsForQueue < 1,
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
      const messages = parsePop3Messages(listResponseRaw);

      if (messages.length === 0) {
        logger.info('No messages found in inbox while checking for bounces.');
        return { output: { status: 'empty' } };
      }

      logger.info(
        `Found ${messages.length} messages in inbox while checking for bounces. Processing...`,
      );

      for (const { id: messageId, uid } of messages) {
        // Check for previous failures
        const trackingResults = await payload.find({
          collection: 'smtp-bounce-mail-tracking',
          where: { uid: { equals: uid } },
          limit: 1,
        });

        const trackingRecord = trackingResults.docs[0];
        const failureCount = trackingRecord?.failureCount ?? 0;

        if (failureCount >= 3) {
          logger.error({
            msg: `Message ${uid} (ID ${messageId}) failed ${failureCount} times. Poison pill detected. Deleting from inbox.`,
          });
          await pop3.DELE(messageId);
          await payload.delete({
            collection: 'smtp-bounce-mail-tracking',
            where: { uid: { equals: uid } },
          });
          continue;
        }

        try {
          const rawEmail = await pop3.RETR(messageId);
          const rawEmailString = String(rawEmail);
          const parsedEmail = await simpleParser(rawEmailString);

          const { isSuccess, dsnString } = determineDeliveryStatus(parsedEmail);
          const envId = getOriginalEnvelopeId(parsedEmail);

          let matched = false;

          // Process if a valid envId was extracted
          if (typeof envId === 'string' && envId.length > 0) {
            matched = await updateTrackingRecords(
              payload,
              envId,
              isSuccess,
              dsnString,
              rawEmailString,
            );
          }

          // Fallback matching if Original-Envelope-Id matching fails or doesn't exist
          if (!matched) {
            const possibleIds = new Set<string>();

            const textForRegex = typeof parsedEmail.text === 'string' ? parsedEmail.text : '';

            const extractMatches = (regex: RegExp, sourceString: string): void => {
              let m;
              // reset regex state if global
              regex.lastIndex = 0;
              while ((m = regex.exec(sourceString)) !== null) {
                if (m[1] !== undefined) possibleIds.add(m[1].trim());
              }
            };

            // Normalize extracted IDs by removing angle brackets and domain parts for robust comparison
            const messageIdRegex = /Message-ID:\s*<?([^@>\s]+)/gi;
            extractMatches(messageIdRegex, rawEmailString);
            extractMatches(messageIdRegex, textForRegex);

            const queuedRegex = /queued as\s*([a-zA-Z0-9_-]+)/gi;
            extractMatches(queuedRegex, rawEmailString);
            extractMatches(queuedRegex, textForRegex);

            const postfixRegex = /X-Postfix-Queue-ID:\s*([a-zA-Z0-9_-]+)/gi;
            extractMatches(postfixRegex, rawEmailString);
            extractMatches(postfixRegex, textForRegex);

            // Also check the Received header that contains the Queue ID before sending
            const receivedRegex = /with ESMTPSA id\s*([a-zA-Z0-9_-]+)/gi;
            extractMatches(receivedRegex, rawEmailString);

            const extractedIds = [...possibleIds];

            if (extractedIds.length > 0) {
              // Scan recent outgoing emails (up to 1000, within the last 30 days) for these IDs in their smtpResults
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

              const recentOutgoing = await payload.find({
                collection: 'outgoing-emails',
                where: {
                  createdAt: {
                    greater_than_equal: thirtyDaysAgo.toISOString(),
                  },
                },
                limit: 1000,
                sort: '-createdAt',
              });

              for (const outgoingDocument of recentOutgoing.docs) {
                const stringifiedResults = JSON.stringify(outgoingDocument.smtpResults ?? []);
                const foundMatch = extractedIds.some((id) => {
                  // Only match if the ID appears as a complete token, not as a substring
                  const regex = new RegExp(
                    `\\b${id.replaceAll(/[.*+?^${}()|[\\]\\\\]/g, String.raw`\\$&`)}\\b`,
                  );
                  return regex.test(stringifiedResults);
                });

                if (foundMatch) {
                  matched = await updateTrackingRecords(
                    payload,
                    String(outgoingDocument.id),
                    isSuccess,
                    dsnString,
                    rawEmailString,
                  );

                  if (matched) {
                    logger.info(
                      `Fallback processed bounce for outgoing email ${String(outgoingDocument.id)} using ID(s) ${extractedIds.join(',')}`,
                    );
                    break;
                  }
                }
              }
            }
          }
          if (matched) {
            // Only delete if successfully processed and matches an ID in our database
            await pop3.DELE(messageId);

            // Clear failure tracking if successful
            if (trackingRecord?.id !== undefined) {
              await payload.delete({
                collection: 'smtp-bounce-mail-tracking',
                id: trackingRecord.id,
              });
            }
          } else {
            logger.info(
              `Ignored message ${messageId} as envId ${envId} and fallback IDs were not found in this instance.`,
            );
          }
        } catch (error: unknown) {
          // We isolate individual message failures so the loop continues
          // We DO NOT delete the message here so it can be retried on the next run
          logger.error({
            err: error instanceof Error ? error : new Error(String(error)),
            msg: `Failed to process message ${messageId} (UID ${uid}), leaving in inbox for retry`,
          });

          // Increment failure count
          const data = {
            failureCount: failureCount + 1,
            lastAttempt: new Date().toISOString(),
          };

          // eslint-disable-next-line unicorn/prefer-ternary
          if (trackingRecord?.id === undefined) {
            await payload.create({
              collection: 'smtp-bounce-mail-tracking',
              data: {
                ...data,
                uid,
              },
            });
          } else {
            await payload.update({
              collection: 'smtp-bounce-mail-tracking',
              id: trackingRecord.id,
              data,
            });
          }
        }
      }
    } catch (error: unknown) {
      logger.error({
        err: error instanceof Error ? error : new Error(String(error)),
        msg: 'POP3 fetch error in fetchSmtpBounces',
      });
      return { output: { status: 'error' } };
    } finally {
      // Guaranteed resource cleanup, even if exceptions are thrown early
      await pop3.QUIT().catch((error: unknown) =>
        logger.error({
          err: error instanceof Error ? error : new Error(String(error)),
          msg: 'Failed to close POP3 connection safely',
        }),
      );
    }

    return { output: { status: 'processed' } };
  },
};
