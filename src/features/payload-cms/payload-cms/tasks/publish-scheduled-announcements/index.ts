/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  getLexicalText,
  publishAnnouncementToPostgres,
} from '@/features/payload-cms/payload-cms/collections/announcements';
import {
  cleanupStaleScheduledJobs,
  DEFAULT_QUEUE,
} from '@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs';
import type { PayloadRequest, TaskConfig } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

export const publishScheduledAnnouncementsTask: TaskConfig<'publishScheduledAnnouncements'> = {
  slug: 'publishScheduledAnnouncements',
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
        (error as { status?: number }).status === 404
      ) {
        return;
      }
      req.payload.logger.error({
        err: error instanceof Error ? error : new Error(String(error)),
        msg: `Failed to auto-delete completed publishScheduledAnnouncements job: ${String(job.id)}`,
      });
    }
  },
  schedule: [
    {
      cron: '* * * * *', // Run every minute
      queue: DEFAULT_QUEUE,
      hooks: {
        beforeSchedule: async ({
          queueable,
          req,
        }): Promise<{ shouldSchedule: boolean; input: Record<string, never> }> => {
          await cleanupStaleScheduledJobs(req, 'publishScheduledAnnouncements', 5);

          const runnableOrActiveJobsForQueue = await countRunnableOrActiveJobsForQueue({
            queue: queueable.scheduleConfig.queue,
            req,
            taskSlug: 'publishScheduledAnnouncements',
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

    const now = new Date();

    // Query announcements where status is scheduled and scheduledAt is in the past/present
    const scheduledAnnouncements = await payload.find({
      collection: 'announcements',
      where: {
        and: [
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
        const authorValue = announcement.author;
        const authorUuid = typeof authorValue === 'string' ? authorValue : '';

        const channelValue = announcement.channel;
        const channelId = typeof channelValue === 'string' ? channelValue : '';

        const announcementTitle = announcement.title;

        logger.info(`Publishing scheduled announcement "${announcementTitle}"...`);

        // 1. Fetch the announcement with all translations
        const announcementAll = (await payload.findByID({
          collection: 'announcements',
          id: announcement.id,
          locale: 'all',
          draft: true,
        })) as unknown as Record<string, Record<string, unknown>>;

        // 2. Build the localized payload for all locales
        const localizedPayload: Record<string, { text: string; title: string; body: string }> = {};
        for (const lang of ['de', 'en', 'fr']) {
          const documentTitle = announcementAll['title'] as Record<string, string> | undefined;
          const documentContent = announcementAll['content'];

          const title = documentTitle?.[lang] ?? '';
          const content = documentContent?.[lang];
          if (title !== '' || content !== undefined) {
            const formattedContent = getLexicalText(content);
            const fullTextContent = `*${title}*\n\n${formattedContent}`;
            localizedPayload[lang] = {
              text: fullTextContent,
              title: title,
              body: formattedContent,
            };
          }
        }

        const { messageUuid, publishedAt } = await publishAnnouncementToPostgres(
          channelId,
          localizedPayload,
          authorUuid,
          request,
        );

        // Update the announcement document status to published
        await payload.update({
          collection: 'announcements',
          id: announcement.id,
          data: {
            status: 'published',
            chatMessageUuid: messageUuid,
            publishedAt: publishedAt.toISOString(),
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
