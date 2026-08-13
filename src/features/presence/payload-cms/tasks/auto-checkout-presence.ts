import { environmentVariables } from '@/config/environment-variables';
import {
  cleanupCompletedScheduledJobs,
  cleanupStaleScheduledJobs,
  DEFAULT_QUEUE,
} from '@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs';
import prisma from '@/lib/db/prisma';
import type { PayloadRequest, TaskConfig } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

/**
 * Users are checked out in batches so that a failure part-way through leaves a consistent state:
 * everyone already processed is checked out and logged, everyone else still carries
 * `presentAtCamp`, and the next scheduled run picks exactly those up again.
 */
const CHECKOUT_BATCH_SIZE = 100;

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

export const autoCheckoutPresenceTask: TaskConfig<{
  input: Record<string, never>;
  output: { checkedOut: number };
}> = {
  slug: 'autoCheckoutPresence',
  retries: 0,
  schedule: [
    {
      cron: '*/5 * * * *', // Run every 5 minutes
      queue: DEFAULT_QUEUE,
      hooks: {
        beforeSchedule: async ({
          queueable,
          req,
        }): Promise<{ shouldSchedule: boolean; input: Record<string, never> }> => {
          await cleanupCompletedScheduledJobs(req, 'autoCheckoutPresence');
          await cleanupStaleScheduledJobs(req, 'autoCheckoutPresence', 30);

          const runnableOrActiveJobsForQueue = await countRunnableOrActiveJobsForQueue({
            queue: queueable.scheduleConfig.queue,
            req,
            taskSlug: 'autoCheckoutPresence',
            onlyScheduled: true,
          });

          return {
            shouldSchedule: runnableOrActiveJobsForQueue < 1,
            input: {},
          };
        },
      },
    },
  ],
  inputSchema: [],
  outputSchema: [
    {
      name: 'checkedOut',
      type: 'number',
    },
  ],
  /**
   * Closes the campsite presence records once the tracking period is over.
   *
   * `presentAtCamp` is a manual flag, so everybody who is still checked in when the camp ends
   * would stay "present" forever — the dashboard would keep counting them and the presence log
   * would have no closing entry for them. This checks those users out at `endDate` (not at the
   * time the job happens to run), so the recorded stay matches the camp and the logs stay usable
   * for a later evaluation.
   */
  handler: async ({
    req: request,
  }: {
    req: PayloadRequest;
  }): Promise<{ output: { checkedOut: number } }> => {
    const { payload } = request;
    const { logger } = payload;

    if (!environmentVariables.FEATURE_ENABLE_PRESENCE_TRACKING) {
      return { output: { checkedOut: 0 } };
    }

    const globalData = await payload.findGlobal({ slug: 'campsite-presence' });
    if (globalData.endDate === undefined || globalData.endDate === null) {
      return { output: { checkedOut: 0 } };
    }

    const endDate = new Date(globalData.endDate);
    if (Number.isNaN(endDate.getTime()) || new Date() < endDate) {
      return { output: { checkedOut: 0 } };
    }

    const presentUsers = await prisma.user.findMany({
      where: { presentAtCamp: true },
      select: { uuid: true },
    });

    if (presentUsers.length === 0) {
      return { output: { checkedOut: 0 } };
    }

    logger.info(
      `Campsite presence ended at ${endDate.toISOString()}, checking out ${presentUsers.length} user(s).`,
    );

    let checkedOut = 0;

    for (const batch of chunk(
      presentUsers.map((user) => user.uuid),
      CHECKOUT_BATCH_SIZE,
    )) {
      /**
       * Postgres first, mirroring the order the presence slider writes in: the `users`
       * afterChange hook compares against Postgres, so the Payload update below sees a value
       * that already matches and does not append a second log entry.
       */
      await prisma.$transaction([
        prisma.user.updateMany({
          where: { uuid: { in: batch } },
          data: { presentAtCamp: false },
        }),
        prisma.presenceLog.createMany({
          data: batch.map((uuid) => ({ userUuid: uuid, isPresent: false, timestamp: endDate })),
        }),
      ]);

      await payload.update({
        collection: 'users',
        where: { id: { in: batch } },
        data: { presentAtCamp: false },
      });

      for (const uuid of batch) {
        try {
          await payload.create({
            collection: 'presence-logs',
            data: {
              user: uuid,
              isPresent: false,
              timestamp: endDate.toISOString(),
            },
          });
        } catch (error) {
          // The Prisma log above is what the density plot and the export read, so a failed
          // mirror must not stop the checkout — it only leaves a gap in the admin panel view.
          logger.warn(
            `[autoCheckoutPresence] Could not mirror the check-out of ${uuid} to Payload: ${String(error)}`,
          );
        }
      }

      checkedOut += batch.length;
    }

    logger.info(`Checked out ${checkedOut} user(s) at the end of the campsite presence period.`);

    return { output: { checkedOut } };
  },
};
