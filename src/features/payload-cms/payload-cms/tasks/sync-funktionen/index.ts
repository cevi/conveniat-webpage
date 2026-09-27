import { environmentVariables } from '@/config/environment-variables';
import {
  cleanupCompletedScheduledJobs,
  cleanupStaleScheduledJobs,
  DEFAULT_QUEUE,
} from '@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs';
import {
  scheduleUnlessQueued,
  type ScheduleDecision,
} from '@/features/payload-cms/payload-cms/tasks/schedule-decision';
import { syncFunktionen } from '@/features/payload-cms/payload-cms/utils/sync-funktionen';
import { getHitobito } from '@/lib/hitobito';
import type { PayloadRequest, TaskConfig } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

/**
 * Syncs the camp functions from Cevi.DB, every night and whenever an editor starts it from
 * the Funktionen list. Does nothing on a deployment without a root group.
 */
export const syncFunktionenTask: TaskConfig<'syncFunktionen'> = {
  slug: 'syncFunktionen',
  retries: 0,
  schedule: [
    {
      cron: '0 3 * * *', // every night at three
      queue: DEFAULT_QUEUE,
      hooks: {
        beforeSchedule: async ({ queueable, req }): Promise<ScheduleDecision> => {
          await cleanupCompletedScheduledJobs(req, 'syncFunktionen');
          await cleanupStaleScheduledJobs(req, 'syncFunktionen', 60);

          const runnableOrActiveJobsForQueue = await countRunnableOrActiveJobsForQueue({
            queue: queueable.scheduleConfig.queue,
            req,
            taskSlug: 'syncFunktionen',
            onlyScheduled: true,
          });

          return scheduleUnlessQueued(runnableOrActiveJobsForQueue, queueable.waitUntil);
        },
      },
    },
  ],
  inputSchema: [],
  handler: async ({
    req: request,
  }: {
    req: PayloadRequest;
  }): Promise<{ output: Record<string, unknown> }> => {
    const { payload } = request;
    const rootGroupId = environmentVariables.CEVIDB_FUNCTIONS_ROOT_GROUP_ID;
    if (rootGroupId === '') return { output: { skipped: true } };

    const hitobito = await getHitobito(payload);
    const result = await syncFunktionen(
      payload,
      {
        getGroupName: (groupId) => hitobito.groups.getGroupName(groupId),
        listSubgroups: (groupId) => hitobito.groups.listSubgroups(groupId),
        listPeopleWithRole: (groupId, roleClass) =>
          hitobito.groups.listPeopleWithRole(groupId, roleClass),
      },
      rootGroupId,
    );
    payload.logger.info(result, 'Synced the camp functions from Cevi.DB');
    return { output: { ...result } };
  },
};
