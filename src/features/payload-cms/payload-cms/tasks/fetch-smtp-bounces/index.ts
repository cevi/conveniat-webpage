import { environmentVariables } from '@/config/environment-variables';
import {
  cleanupStaleScheduledJobs,
  DEFAULT_QUEUE,
} from '@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs';
import { updateTrackingRecords } from '@/features/payload-cms/payload-cms/tasks/fetch-smtp-bounces/db';
import {
  determineDeliveryStatus,
  getOriginalEnvelopeId,
  parsePop3Messages,
} from '@/features/payload-cms/payload-cms/tasks/fetch-smtp-bounces/email-parser';
import { redis } from '@/lib/db/redis';
import { simpleParser } from 'mailparser';
import POP3Command from 'node-pop3';
import type { PayloadRequest, TaskConfig } from 'payload';

const FETCH_SMTP_BOUNCES_CRON = '*/15 * * * *'; // Every 15 minutes

const REDIS_BACKOFF_FAILURES_KEY = 'fetchSmtpBounces:backoff:failures';
const REDIS_BACKOFF_NEXT_ATTEMPT_KEY = 'fetchSmtpBounces:backoff:nextAttempt';

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
      if (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        error.status === 404
      ) {
        // Job was likely already deleted by another instance
        return;
      }

      req.payload.logger.error({
        err: error instanceof Error ? error : new Error(String(error)),
        msg: `Failed to auto-delete completed fetchSmtpBounces job: ${String(job.id)}`,
      });
    }
  },
  schedule: [
    {
      cron: FETCH_SMTP_BOUNCES_CRON,
      queue: DEFAULT_QUEUE,
      hooks: {
        beforeSchedule: async ({
          req,
        }): Promise<{ shouldSchedule: boolean; input: Record<string, never> }> => {
          // 1. Calculate the 15-minute slot lock to ensure only one instance schedules the job in a cluster
          const periodMs = 15 * 60 * 1000;
          const currentSlot = Math.floor(Date.now() / periodMs) * periodMs;
          const lockKey = `fetchSmtpBounces:schedule-lock:${currentSlot}`;

          let hasLock = false;
          try {
            const result = await redis.set(lockKey, '1', 'PX', 60_000, 'NX');
            hasLock = result === 'OK';
          } catch (error) {
            req.payload.logger.error({
              err: error instanceof Error ? error : new Error(String(error)),
              msg: 'Failed to acquire Redis scheduling lock. Falling back to DB checks.',
            });
            hasLock = true;
          }

          if (!hasLock) {
            req.payload.logger.info(
              'fetchSmtpBounces: another cluster instance already scheduled this slot. Skipping.',
            );
            return {
              shouldSchedule: false,
              input: {},
            };
          }

          await cleanupStaleScheduledJobs(req, 'fetchSmtpBounces', 15);

          // 2. Prevent parallel execution: check if there is an uncompleted fetchSmtpBounces job
          let activeJobsCount = 0;
          try {
            const activeCountResult = await req.payload.count({
              collection: 'payload-jobs',
              where: {
                and: [
                  { taskSlug: { equals: 'fetchSmtpBounces' } },
                  { completedAt: { exists: false } },
                ],
              },
            });
            activeJobsCount = activeCountResult.totalDocs;
          } catch (error) {
            req.payload.logger.error({
              err: error instanceof Error ? error : new Error(String(error)),
              msg: 'Failed to count active fetchSmtpBounces jobs. Skipping schedule to be safe.',
            });
            return {
              shouldSchedule: false,
              input: {},
            };
          }

          if (activeJobsCount > 0) {
            req.payload.logger.info(
              `fetchSmtpBounces: ${activeJobsCount} active jobs already exist. Skipping scheduling.`,
            );
            return {
              shouldSchedule: false,
              input: {},
            };
          }

          // 3. Only run POP3 check if we have outgoing emails sent in the last 7 days that are still missing dsnReceivedAt
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          let pendingDsnCount = 0;
          try {
            const pendingCountResult = await req.payload.count({
              collection: 'outgoing-emails',
              where: {
                and: [
                  { dsnReceivedAt: { exists: false } },
                  { createdAt: { greater_than_equal: sevenDaysAgo.toISOString() } },
                ],
              },
            });
            pendingDsnCount = pendingCountResult.totalDocs;
          } catch (error) {
            req.payload.logger.error({
              err: error instanceof Error ? error : new Error(String(error)),
              msg: 'Failed to query pending DSN email count. Skipping schedule.',
            });
            return {
              shouldSchedule: false,
              input: {},
            };
          }

          if (pendingDsnCount === 0) {
            req.payload.logger.info(
              'fetchSmtpBounces: No outgoing emails in the last 7 days are waiting for DSN. Skipping.',
            );
            return {
              shouldSchedule: false,
              input: {},
            };
          }

          req.payload.logger.info(
            `fetchSmtpBounces: Slot lock acquired, ${pendingDsnCount} pending DSN emails found. Scheduling job.`,
          );

          return {
            shouldSchedule: true,
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

    let consecutiveConnectionFailures = 0;
    let nextAllowedAttemptTime = 0;

    try {
      const failuresValue = await redis.get(REDIS_BACKOFF_FAILURES_KEY);
      consecutiveConnectionFailures =
        failuresValue !== null && failuresValue !== '' ? Number.parseInt(failuresValue, 10) : 0;

      const nextAttemptValue = await redis.get(REDIS_BACKOFF_NEXT_ATTEMPT_KEY);
      nextAllowedAttemptTime =
        nextAttemptValue !== null && nextAttemptValue !== ''
          ? Number.parseInt(nextAttemptValue, 10)
          : 0;
    } catch (error) {
      logger.error({
        err: error instanceof Error ? error : new Error(String(error)),
        msg: 'Failed to read POP3 backoff state from Redis. Continuing without backoff.',
      });
    }

    if (Date.now() < nextAllowedAttemptTime) {
      logger.info(
        `fetchSmtpBounces task is backed-off. Next attempt allowed after: ${new Date(
          nextAllowedAttemptTime,
        ).toISOString()}`,
      );
      return { output: { status: 'backed-off' } };
    }

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
      // Reset backoff on successful connection
      consecutiveConnectionFailures = 0;
      nextAllowedAttemptTime = 0;

      try {
        await redis.set(REDIS_BACKOFF_FAILURES_KEY, '0');
        await redis.set(REDIS_BACKOFF_NEXT_ATTEMPT_KEY, '0');
      } catch (error) {
        logger.error({
          err: error instanceof Error ? error : new Error(String(error)),
          msg: 'Failed to reset backoff state in Redis',
        });
      }

      const messages = parsePop3Messages(listResponseRaw);

      if (messages.length === 0) {
        logger.info('No messages found in inbox while checking for bounces.');
        return { output: { status: 'empty' } };
      }

      logger.info(
        `Found ${messages.length} messages in inbox while checking for bounces. Processing...`,
      );

      let ignoredCount = 0;
      let matchedCount = 0;
      let poisonPillCount = 0;
      let errorCount = 0;

      // Memoize the recent outgoing emails in a map to prevent gigabytes of memory allocation
      // and nested O(N*M) lookups when processing hundreds of bounce emails in a single fetch job
      let cachedOutgoingIdMap: Map<string, string> | undefined = undefined;

      for (const { id: messageId, uid } of messages) {
        // Sleep 500ms to maintain max 2 requests per second POP3 rate limit
        await new Promise((resolve) => setTimeout(resolve, 500));
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
          poisonPillCount++;
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
              if (cachedOutgoingIdMap === undefined) {
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
                  select: {
                    smtpResults: true,
                  },
                });

                cachedOutgoingIdMap = new Map<string, string>();
                for (const document_ of recentOutgoing.docs) {
                  const resultsString = JSON.stringify(document_.smtpResults ?? []);
                  // Extract all potential queue IDs, message IDs, and alphanumeric tokens
                  const tokens = resultsString.match(/[a-zA-Z0-9_-]+/g) ?? [];
                  for (const token of tokens) {
                    cachedOutgoingIdMap.set(token.toLowerCase(), String(document_.id));
                  }
                }
              }

              for (const id of extractedIds) {
                const matchedDocumentId = cachedOutgoingIdMap.get(id.toLowerCase());
                if (matchedDocumentId !== undefined) {
                  matched = await processTrackingUpdate(matchedDocumentId);

                  if (matched) {
                    logger.info(
                      `Fallback processed bounce for outgoing email ${matchedDocumentId} using ID(s) ${extractedIds.join(',')}`,
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
            matchedCount++;
          } else {
            ignoredCount++;
          }
        } catch (error: unknown) {
          // We isolate individual message failures so the loop continues
          // We DO NOT delete the message here so it can be retried on the next run
          logger.error({
            err: error instanceof Error ? error : new Error(String(error)),
            msg: `Failed to process message ${messageId} (UID ${uid}), leaving in inbox for retry`,
          });
          errorCount++;

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

      // Log a single summary line instead of per-message noise
      logger.info(
        `Bounce check complete: ${messages.length} messages scanned, ${matchedCount} matched, ${ignoredCount} ignored (other instance), ${poisonPillCount} poison-pill deleted, ${errorCount} errors`,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isConnectionError =
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('EHOSTUNREACH') ||
        errorMessage.includes('ENOTFOUND');

      if (isConnectionError) {
        consecutiveConnectionFailures++;
        // Exponential backoff: 5m, 10m, 20m, 40m... max 4 hours
        const backoffMinutes = Math.min(5 * 2 ** (consecutiveConnectionFailures - 1), 240);
        nextAllowedAttemptTime = Date.now() + backoffMinutes * 60 * 1000;

        try {
          await redis.set(REDIS_BACKOFF_FAILURES_KEY, String(consecutiveConnectionFailures));
          await redis.set(REDIS_BACKOFF_NEXT_ATTEMPT_KEY, String(nextAllowedAttemptTime));
        } catch (redisError) {
          logger.error({
            err: redisError instanceof Error ? redisError : new Error(String(redisError)),
            msg: 'Failed to save POP3 backoff state in Redis',
          });
        }

        logger.error({
          err: error instanceof Error ? error : new Error(String(error)),
          msg: `POP3 connection error in fetchSmtpBounces. Backing off for ${backoffMinutes} minutes.`,
        });
      } else {
        logger.error({
          err: error instanceof Error ? error : new Error(String(error)),
          msg: 'POP3 fetch error in fetchSmtpBounces',
        });
      }
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
