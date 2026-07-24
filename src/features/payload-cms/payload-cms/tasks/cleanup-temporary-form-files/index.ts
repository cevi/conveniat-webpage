import {
  cleanupCompletedScheduledJobs,
  cleanupStaleScheduledJobs,
  DEFAULT_QUEUE,
} from '@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs';
import type { PayloadRequest, TaskConfig } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

export const cleanupTemporaryFormFilesTask: TaskConfig<'cleanupTemporaryFormFiles'> = {
  slug: 'cleanupTemporaryFormFiles',
  retries: 0,
  schedule: [
    {
      cron: '0 * * * *', // Run hourly
      queue: DEFAULT_QUEUE,
      hooks: {
        beforeSchedule: async ({
          queueable,
          req,
        }): Promise<{ shouldSchedule: boolean; input: Record<string, never> }> => {
          await cleanupCompletedScheduledJobs(req, 'cleanupTemporaryFormFiles');
          await cleanupStaleScheduledJobs(req, 'cleanupTemporaryFormFiles', 60);

          const runnableOrActiveJobsForQueue = await countRunnableOrActiveJobsForQueue({
            queue: queueable.scheduleConfig.queue,
            req,
            taskSlug: 'cleanupTemporaryFormFiles',
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
    req: request,
  }: {
    req: PayloadRequest;
  }): Promise<{ output: Record<string, unknown> }> => {
    const { payload } = request;
    const { logger } = payload;

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const staleFiles = await payload.find({
      collection: 'form_collection',
      where: {
        and: [{ isTemporary: { equals: true } }, { createdAt: { less_than: twentyFourHoursAgo } }],
      },
      limit: 100,
      depth: 0,
    });

    if (staleFiles.docs.length > 0) {
      logger.info(
        `Found ${staleFiles.docs.length} temporary form file(s) older than 24 hours. Deleting...`,
      );

      for (const fileDocument of staleFiles.docs) {
        try {
          await payload.delete({
            collection: 'form_collection',
            id: fileDocument.id,
          });
        } catch (error) {
          logger.error(`Error deleting temporary form file ${fileDocument.id}: ${String(error)}`);
        }
      }
    }

    return { output: {} };
  },
};
