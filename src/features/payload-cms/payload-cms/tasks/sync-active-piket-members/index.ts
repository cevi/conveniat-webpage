import { syncPiketMembersToOpenChats } from '@/features/chat/api/utils/piket-service';
import {
  cleanupCompletedScheduledJobs,
  cleanupStaleScheduledJobs,
  DEFAULT_QUEUE,
} from '@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs';
import type { PayloadRequest, TaskConfig } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

export const syncActivePiketMembersTask: TaskConfig = {
  slug: 'syncActivePiketMembers',
  retries: 0,
  schedule: [
    {
      cron: '* * * * *', // Every minute to catch shift changes promptly
      queue: DEFAULT_QUEUE,
      hooks: {
        beforeSchedule: async ({
          queueable,
          req,
        }): Promise<{ shouldSchedule: boolean; input: Record<string, never> }> => {
          await cleanupCompletedScheduledJobs(req, 'syncActivePiketMembers');
          await cleanupStaleScheduledJobs(req, 'syncActivePiketMembers', 15);

          const runnableOrActiveJobsForQueue = await countRunnableOrActiveJobsForQueue({
            queue: queueable.scheduleConfig.queue,
            req,
            taskSlug: 'syncActivePiketMembers',
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
  handler: async ({
    req,
  }: {
    req: PayloadRequest;
  }): Promise<{ output: Record<string, unknown> }> => {
    await syncPiketMembersToOpenChats(req.payload);
    return { output: {} };
  },
};
