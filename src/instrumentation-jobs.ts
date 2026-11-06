import { markPayloadInitFailed } from '@/features/payload-cms/payload-cms/initialization/init-state';
import { startJobRunner } from '@/features/payload-cms/payload-cms/tasks/job-runner';
import { isBuildPhase } from '@/utils/build-phase';
import { createLogger } from '@/utils/server-logger';
import { context, ROOT_CONTEXT } from '@opentelemetry/api';
import config from '@payload-config';
import { getPayload } from 'payload';

const logger = createLogger('instrumentation-jobs');

/**
 * Starts the job runner once per server process, detached from any request.
 *
 * The runner is ours, not Payload's `autoRun`; `startJobRunner` says why. Payload's crons used
 * to be born inside whichever admin request first called `getPayload({ cron: true })` after a
 * restart. Timers keep the async context they were created in, so every tick for the rest of
 * the process lifetime ran inside that one request span, and every job log line carried its
 * dead `trace_id`. The same holds for our timers, so they are created here under
 * `ROOT_CONTEXT`, and each job's spans and logs stand on their own.
 */
export const startJobsRunner = async (): Promise<void> => {
  // Payload cannot be initialized during the production build: there is no database to reach.
  if (isBuildPhase()) return;

  await context.with(ROOT_CONTEXT, async () => {
    try {
      const payload = await getPayload({ config });
      startJobRunner(payload);
      logger.info('Payload job runner started');
    } catch (error: unknown) {
      // Payload would initialize again on the next request, but without `onPayloadInit`.
      markPayloadInitFailed();
      logger.error('Could not start the Payload job runner', { error });
    }
  });
};
