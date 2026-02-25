import { getHitobito, HITOBITO_CONFIG } from '@/features/registration_process/hitobito-api';
import type { PayloadRequest, TaskConfig } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

export const checkHitobitoApprovalsTask: TaskConfig<'checkHitobitoApprovals'> = {
  slug: 'checkHitobitoApprovals',
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
      req.payload.logger.error({
        err: error instanceof Error ? error : new Error(String(error)),
        msg: `Failed to auto-delete completed checkHitobitoApprovals job: ${String(job.id)}`,
      });
    }
  },
  schedule: [
    {
      cron: '0 */2 * * *', // Every 2 hours
      queue: 'default',
      hooks: {
        beforeSchedule: async ({
          queueable,
          req,
        }): Promise<{ shouldSchedule: boolean; input: Record<string, never> }> => {
          const runnableOrActiveJobsForQueue = await countRunnableOrActiveJobsForQueue({
            queue: queueable.scheduleConfig.queue,
            req,
            taskSlug: 'checkHitobitoApprovals', // Type issue here initially since we didn't export it globally
            onlyScheduled: true,
          });

          req.payload.logger.info(
            `Scheduler evaluated checkHitobitoApprovals. Active/Runnable jobs: ${runnableOrActiveJobsForQueue}`,
          );

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
    const { payload } = req;
    const { logger } = payload;
    const { helperGroupId: groupId } = HITOBITO_CONFIG;

    if (groupId === undefined || groupId === '') {
      throw new Error('Configuration Error: HELPER_GROUP is missing');
    }

    const blockedJobs = await payload.find({
      collection: 'blocked-jobs',
      where: {
        and: [
          { status: { equals: 'pending' } },
          { workflowSlug: { equals: 'registrationWorkflow' } },
        ],
      },
      limit: 100,
    });

    if (blockedJobs.docs.length === 0) {
      logger.info('No pending blocked registration workflows waiting for approval.');
      return { output: {} };
    }

    logger.info(`Found ${blockedJobs.docs.length} blocked jobs. Checking approvals...`);
    const hitobito = await getHitobito(payload, logger);

    for (const blockedJob of blockedJobs.docs) {
      try {
        const input = blockedJob.input as Record<string, unknown>;
        const userId =
          typeof input['resolvedUserId'] === 'string' ? input['resolvedUserId'] : undefined;

        if (userId === undefined || userId === '') {
          logger.warn(`Blocked job ${blockedJob.id} has no resolvedUserId.`);
          continue;
        }

        const activeRoleId = await hitobito.groups.checkActiveRole({
          personId: userId,
          groupId,
        });

        if (activeRoleId === undefined) {
          logger.info(`User ${userId} still waiting for approval.`);
        } else {
          logger.info(`Approval granted for user ${userId}. Resuming workflow...`);

          await payload.update({
            collection: 'blocked-jobs',
            id: blockedJob.id,
            data: { status: 'resolved' },
          });

          if (blockedJob.input !== null && typeof blockedJob.input === 'object') {
            await payload.jobs.queue({
              workflow: blockedJob.workflowSlug as 'registrationWorkflow',
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
              input: blockedJob.input as any,
            });
          } else {
            logger.warn(`Blocked job ${blockedJob.id} has invalid input types.`);
          }
        }
      } catch (error) {
        logger.error(`Error processing blocked job ${blockedJob.id}: ${String(error)}`);
      }
    }

    return { output: {} };
  },
};
