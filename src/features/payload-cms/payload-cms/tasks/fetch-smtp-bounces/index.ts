import { environmentVariables } from '@/config/environment-variables';
import { updateTrackingRecords } from '@/features/payload-cms/payload-cms/tasks/fetch-smtp-bounces/db';
import {
  determineDeliveryStatus,
  getOriginalEnvelopeId,
  parsePop3Messages,
} from '@/features/payload-cms/payload-cms/tasks/fetch-smtp-bounces/email-parser';
import { simpleParser } from 'mailparser';
import POP3Command from 'node-pop3';
import type { PayloadRequest, TaskConfig } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

export const fetchSmtpBouncesTask: TaskConfig<'fetchSmtpBounces'> = {
  slug: 'fetchSmtpBounces',
  retries: 0,
  /**
   * We selectively auto-delete only the `fetchSmtpBounces` job upon successful completion
   * to keep the `payload-jobs` collection clean, as this task runs very frequently (every 5 minutes).
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
      cron: '*/5 * * * *', // Every 5 minutes
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

          const { isSuccess, dsnString, recipientBounces } = determineDeliveryStatus(parsedEmail);
          const envId = getOriginalEnvelopeId(parsedEmail);

          let matched = false;

          const processTrackingUpdate = async (idToMatch: string): Promise<boolean> => {
            if (recipientBounces.length > 0) {
              let updatedAny = false;
              for (const bounce of recipientBounces) {
                const response = await updateTrackingRecords(
                  payload,
                  idToMatch,
                  bounce.isSuccess,
                  dsnString,
                  rawEmailString,
                  bounce.email,
                );
                if (response) updatedAny = true;
              }
              return updatedAny;
            }

            return await updateTrackingRecords(
              payload,
              idToMatch,
              isSuccess,
              dsnString,
              rawEmailString,
            );
          };

          // Process if a valid envId was extracted
          if (typeof envId === 'string' && envId.length > 0) {
            matched = await processTrackingUpdate(envId);
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
                  matched = await processTrackingUpdate(String(outgoingDocument.id));

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
