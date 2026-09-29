import {
  cleanupCompletedScheduledJobs,
  cleanupStaleScheduledJobs,
  DEFAULT_QUEUE,
} from '@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs';
import {
  scheduleUnlessQueued,
  type ScheduleDecision,
} from '@/features/payload-cms/payload-cms/tasks/schedule-decision';
import type { PayloadRequest, TaskConfig } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

export const publishScheduledAnnouncementsTask: TaskConfig<'publishScheduledAnnouncements'> = {
  slug: 'publishScheduledAnnouncements',
  retries: 0,
  schedule: [
    {
      cron: '* * * * *', // Run every minute
      queue: DEFAULT_QUEUE,
      hooks: {
        beforeSchedule: async ({ queueable, req }): Promise<ScheduleDecision> => {
          await cleanupCompletedScheduledJobs(req, 'publishScheduledAnnouncements');
          await cleanupStaleScheduledJobs(req, 'publishScheduledAnnouncements', 5);

          const runnableOrActiveJobsForQueue = await countRunnableOrActiveJobsForQueue({
            queue: queueable.scheduleConfig.queue,
            req,
            taskSlug: 'publishScheduledAnnouncements',
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
    const { logger } = payload;

    const now = new Date();

    // Query announcements where status is scheduled and scheduledAt is in the past/present.
    // Only published ones: an editor unpublishes a scheduled announcement to call it off.
    const scheduledAnnouncements = await payload.find({
      collection: 'announcements',
      where: {
        and: [
          { _status: { equals: 'published' } },
          { status: { equals: 'scheduled' } },
          { scheduledAt: { less_than_equal: now.toISOString() } },
        ],
      },
      limit: 100,
      depth: 0,
    });

    if (scheduledAnnouncements.docs.length === 0) {
      return { output: {} };
    }

    logger.info(`Found ${scheduledAnnouncements.docs.length} scheduled announcements to publish.`);

    for (const announcement of scheduledAnnouncements.docs) {
      try {
        const announcementTitle = announcement.displayTitle;

        logger.info(`Publishing scheduled announcement "${announcementTitle}"...`);

        // The same update an editor's publish makes: the collection hooks send the message
        // and the push only once Payload has validated and saved the announcement, so an
        // announcement that fails validation sends nothing and stays scheduled.
        const { chatMessageUuid: messageUuid } = await payload.update({
          collection: 'announcements',
          id: announcement.id,
          data: {
            _status: 'published',
            status: 'published',
          },
        });

        logger.info(
          `Successfully published scheduled announcement "${announcementTitle}" (UUID: ${messageUuid}).`,
        );
      } catch (error) {
        logger.error(
          `Error publishing scheduled announcement ${announcement.id}: ${String(error)}`,
        );
      }
    }

    return { output: {} };
  },
};
