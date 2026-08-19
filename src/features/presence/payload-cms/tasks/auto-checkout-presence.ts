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
 * Removes a check-out entry that was written to Payload for a check-out that then did not happen
 * in Postgres, so that the retry on the next run cannot produce a second one.
 */
const dropPayloadLog = async (
  request: PayloadRequest,
  id: number | string,
  uuid: string,
): Promise<void> => {
  try {
    await request.payload.delete({ collection: 'presence-logs', id });
  } catch (revertError: unknown) {
    request.payload.logger.warn(
      `[autoCheckoutPresence] Could not revert the Payload check-out entry of ${uuid}: ${String(revertError)}`,
    );
  }
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

    if (presentUsers.length > 0) {
      logger.info(
        `Campsite presence ended at ${endDate.toISOString()}, checking out ${presentUsers.length} user(s).`,
      );
    }

    let checkedOut = 0;

    for (const { uuid } of presentUsers) {
      let payloadLogId: number | string | undefined;

      try {
        /**
         * The Payload log entry is written before the flag it describes, the same way the `users`
         * afterChange hook does it: a flag stored without its log entry would corrupt the density
         * plot and the evaluation permanently, because the user no longer shows up as present and
         * the transition is never logged again.
         */
        const payloadLog = await payload.create({
          collection: 'presence-logs',
          data: {
            user: uuid,
            isPresent: false,
            timestamp: endDate.toISOString(),
          },
        });
        payloadLogId = payloadLog.id;

        /**
         * `presentAtCamp: true` in the filter makes the check-out conditional: a user who checked
         * out through the slider between the query above and this transaction is not touched, and
         * gets no second check-out entry. `count` reports whether this run was the one that
         * closed the record, so only then is the log entry kept.
         */
        const closedByThisRun = await prisma.$transaction(async (tx) => {
          const { count } = await tx.user.updateMany({
            where: { uuid, presentAtCamp: true },
            data: { presentAtCamp: false },
          });

          if (count === 0) return false;

          await tx.presenceLog.create({
            data: { userUuid: uuid, isPresent: false, timestamp: endDate },
          });
          return true;
        });

        if (closedByThisRun) {
          checkedOut += 1;
        } else {
          await dropPayloadLog(request, payloadLogId, uuid);
        }
      } catch (error) {
        // The flag is left as it is so the next run retries this user, and the mirror entry is
        // taken back out so that retry cannot produce a second one. One user failing must not
        // stop the others from being checked out.
        if (payloadLogId !== undefined) {
          await dropPayloadLog(request, payloadLogId, uuid);
        }
        logger.warn(
          `[autoCheckoutPresence] Could not check out ${uuid}, retrying on the next run: ${String(error)}`,
        );
      }
    }

    /**
     * Reconciliation pass: the Payload flag is cleared for everyone at once, independently of what
     * happened above. Because it does not select on the Postgres state, it also repairs users
     * whose Payload document stayed checked in after a failed run — those are invisible to the
     * query at the top, which only sees users who are still present in Postgres.
     *
     * Postgres has already been written at this point, so the `users` afterChange hook compares
     * two matching values and does not append another log entry.
     */
    await payload.update({
      collection: 'users',
      where: { presentAtCamp: { equals: true } },
      data: { presentAtCamp: false },
    });

    logger.info(`Checked out ${checkedOut} user(s) at the end of the campsite presence period.`);

    return { output: { checkedOut } };
  },
};
