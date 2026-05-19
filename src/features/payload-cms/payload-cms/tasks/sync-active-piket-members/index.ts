import { syncPiketMembersToOpenChats } from '@/features/chat/api/utils/piket-service';
import {
  cleanupStaleScheduledJobs,
  DEFAULT_QUEUE,
} from '@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs';
import type { PayloadRequest, TaskConfig } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

export const syncActivePiketMembersTask: TaskConfig = {
  slug: 'syncActivePiketMembers',
  retries: 0,
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
        msg: `Failed to auto-delete completed syncActivePiketMembers job: ${String(job.id)}`,
      });
    }
  },
  schedule: [
    {
      cron: '* * * * *', // Every minute to catch shift changes promptly
      queue: DEFAULT_QUEUE,
      hooks: {
        beforeSchedule: async ({
          queueable,
          req,
        }): Promise<{ shouldSchedule: boolean; input: Record<string, never> }> => {
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
