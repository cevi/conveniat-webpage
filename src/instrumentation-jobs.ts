import { isBuildPhase } from '@/utils/build-phase';
import { createLogger } from '@/utils/server-logger';
import { context, ROOT_CONTEXT } from '@opentelemetry/api';
import config from '@payload-config';
import { getPayload } from 'payload';

const logger = createLogger('instrumentation-jobs');

/**
 * Starts the Payload job runner once per server process, detached from any request.
 *
 * Nothing in our code asks for the runner: Payload creates the `autoRun` crons the first time
 * `getPayload({ cron: true })` is called, and the only callers of that are `@payloadcms/next`'s
 * `initReq` and its login and refresh actions. So the crons were born inside whichever admin
 * request happened to arrive first after a restart. Croner schedules with `setTimeout`, and a
 * timer keeps the async context it was created in, so every tick for the rest of the process
 * lifetime ran inside that one request span — long after it had ended. Every job log line
 * carried that dead span's `trace_id` and `span_id`, which made the trace link on all of them
 * point at a request that has nothing to do with the job.
 *
 * Starting the runner here, under `ROOT_CONTEXT`, gives the crons no ambient span to inherit, so
 * each job's spans and logs stand on their own. It also means the job runner no longer depends on
 * somebody opening the admin panel.
 */
export const startJobsRunner = async (): Promise<void> => {
  // Payload cannot be initialized during the production build: there is no database to reach.
  if (isBuildPhase()) return;

  await context.with(ROOT_CONTEXT, async () => {
    try {
      await getPayload({ config, cron: true });
      logger.info('Payload job runner started');
    } catch (error: unknown) {
      logger.error('Could not start the Payload job runner', { error });
    }
  });
};
