import { environmentVariables as env } from '@/config/environment-variables';
import {
  DEFAULT_QUEUE,
  MAIL_QUEUE,
} from '@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs';
import type { Payload } from 'payload';

type RunJobsSilent = NonNullable<NonNullable<Parameters<Payload['jobs']['run']>[0]>['silent']>;

export interface JobQueueRun {
  queue: string;
  /** The most jobs one tick claims from this queue. */
  limit: number;
  silent: RunJobsSilent;
}

/**
 * Payload logs `Running N jobs.` at info on every tick that finds work. With three queues on
 * a 10s tick that was ~97% of everything the app shipped to Loki, and nobody reads it — the
 * job's own logs carry the detail. Silenced in production only, so the queue still ticks
 * visibly in dev.
 *
 * `silent.info` gates that one line and nothing else; job failures are gated separately by
 * `silent.error` and stay on.
 */
const silent = { info: env.NODE_ENV === 'production' };

/**
 * The queues the job runner works through, none while workflows are switched off.
 */
export const getJobQueueRuns = (): JobQueueRun[] =>
  env.FEATURE_ENABLE_WORKFLOWS
    ? [
        { queue: 'workflows', limit: 10, silent },
        { queue: DEFAULT_QUEUE, limit: 10, silent },
        { queue: MAIL_QUEUE, limit: 10, silent },
      ]
    : [];
