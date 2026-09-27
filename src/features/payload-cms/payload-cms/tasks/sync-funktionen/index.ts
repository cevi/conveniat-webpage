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
import {
  describeFunktionenSyncFailure,
  syncFunktionen,
} from '@/features/payload-cms/payload-cms/utils/sync-funktionen';
import { getHitobito } from '@/lib/hitobito';
import { withSpan } from '@/utils/tracing-helpers';
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
    if (rootGroupId === '') {
      payload.logger.debug('No functions root group configured, not syncing the camp functions');
      return { output: { skipped: true } };
    }

    const startedAt = Date.now();
    try {
      const result = await withSpan(
        'funktionen.sync',
        async (span) => {
          const hitobito = await getHitobito(payload);
          const synced = await syncFunktionen(
            payload,
            {
              getGroupName: (groupId) => hitobito.groups.getGroupName(groupId),
              listSubgroups: (groupId) => hitobito.groups.listSubgroups(groupId),
              listPeopleWithRole: (groupId, roleClass) =>
                hitobito.groups.listPeopleWithRole(groupId, roleClass),
            },
            rootGroupId,
          );
          span.setAttributes({
            'funktionen.groups': synced.groups,
            'funktionen.created': synced.created,
            'funktionen.updated': synced.updated,
            'funktionen.removed': synced.removed,
            'funktionen.users_written': synced.usersWritten,
          });
          return synced;
        },
        { 'funktionen.root_group': rootGroupId },
      );
      // once a night, or when an editor starts it: the outcome of every run belongs in the logs
      payload.logger.info(
        {
          'funktionen.root_group': rootGroupId,
          'funktionen.groups': result.groups,
          'funktionen.created': result.created,
          'funktionen.updated': result.updated,
          'funktionen.removed': result.removed,
          'funktionen.users_written': result.usersWritten,
          'duration.ms': Date.now() - startedAt,
        },
        'Synced the camp functions from Cevi.DB',
      );
      return { output: { ...result } };
    } catch (error: unknown) {
      // A job's error is only kept on its document; logged here, it reaches Loki as well.
      payload.logger.error(
        {
          err: error,
          'funktionen.root_group': rootGroupId,
          'funktionen.failure': describeFunktionenSyncFailure(error),
          'duration.ms': Date.now() - startedAt,
        },
        'Syncing the camp functions from Cevi.DB failed; the functions stay as they were',
      );
      throw error;
    }
  },
};
