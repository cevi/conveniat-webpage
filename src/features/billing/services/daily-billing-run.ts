import {
  buildLatestJobWhere,
  getJobDerivedStatus,
  selectTaskLogOutput,
} from '@/features/billing/services/job-log';
import { pipelineLockFor } from '@/features/billing/services/pipeline-lock';
import { BillingJobStatus, BillingTaskSlug } from '@/features/billing/types';
import type { Payload } from 'payload';

/** How long one daily-run decision may hold its lock. It only reads and queues. */
const RUN_LOCK_TTL_SECONDS = 5 * 60;

/** The hour the run starts at when the settings carry none, after the 03:00 sync. */
const DEFAULT_HOUR = 6;

/** The daily-run settings, as stored on the `bill-settings` global. */
export interface DailyBillingRunConfig {
  enabled?: boolean | null;
  hour?: number | null;
  lastRunAt?: string | null;
}

/** The latest job of one pipeline step, reduced to what the daily run decides on. */
export interface LatestPipelineJob {
  status: BillingJobStatus;
  completedAt?: string | undefined;
  summary?: Record<string, unknown>;
}

export interface DailyBillingRunSummary {
  started: boolean;
  /** Why nothing was started, when nothing was. */
  reason?: string | undefined;
  /** The `generateBills` job this run queued; it queues the send once it is done. */
  generateJobId?: string | undefined;
}

const isSameLocalDay = (value: string | null | undefined, now: Date): boolean => {
  if (typeof value !== 'string' || value === '') return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toDateString() === now.toDateString();
};

/**
 * Whether today's run is still owed.
 *
 * The task wakes hourly, so the configured hour is the earliest start, not the only one: a
 * run that has to wait for a late sync goes out on a later tick of the same day.
 * `lastRunAt` is what keeps it to once a day. Hours are container local time, Europe/Zurich,
 * like the other schedules in Bill Settings.
 */
export function isDailyRunDue(
  config: DailyBillingRunConfig | null | undefined,
  now: Date,
): { due: boolean; reason?: string | undefined } {
  if (config?.enabled !== true) return { due: false, reason: 'The daily billing run is disabled.' };

  const hour = typeof config.hour === 'number' ? Math.trunc(config.hour) : DEFAULT_HOUR;
  if (now.getHours() < hour) return { due: false, reason: 'The configured hour is still ahead.' };

  if (isSameLocalDay(config.lastRunAt, now)) return { due: false, reason: 'Already ran today.' };

  return { due: true };
}

/**
 * Why the pipeline is not ready for today's run, or `undefined` when it is.
 *
 * The same rule as the toolbar's lock on "Rechnungen generieren", plus one: the sync has to
 * be from today. Billing yesterday's state would mail people the Cevi.DB already dropped.
 * A generation or send still running, whoever started it, is waited for rather than raced.
 */
export function findPipelineBlocker(
  jobs: {
    sync?: LatestPipelineJob | undefined;
    generate?: LatestPipelineJob | undefined;
    send?: LatestPipelineJob | undefined;
  },
  now: Date,
): string | undefined {
  if (
    jobs.generate?.status === BillingJobStatus.Pending ||
    jobs.send?.status === BillingJobStatus.Pending
  )
    return 'A bill generation or send is still running.';

  switch (pipelineLockFor(jobs.sync)) {
    case 'never-run': {
      return 'No sync has run yet.';
    }
    case 'running': {
      return 'The sync is still running.';
    }
    case 'unsuccessful': {
      return 'The latest sync did not run to the end.';
    }
    case undefined: {
      break;
    }
  }

  if (!isSameLocalDay(jobs.sync?.completedAt, now)) return 'No sync has completed today.';

  return undefined;
}

const findLatestJob = async (
  payload: Payload,
  taskSlug: BillingTaskSlug,
  now: Date,
): Promise<LatestPipelineJob | undefined> => {
  const result = await payload.find({
    collection: 'payload-jobs',
    where: buildLatestJobWhere(taskSlug, now),
    sort: '-createdAt',
    limit: 1,
    depth: 0,
    context: { internal: true },
  });
  const job = result.docs[0];
  if (!job) return undefined;

  const summary = selectTaskLogOutput(Array.isArray(job.log) ? job.log : [], taskSlug);
  return {
    status: getJobDerivedStatus(job),
    completedAt: job.completedAt ?? undefined,
    ...(summary === undefined ? {} : { summary }),
  };
};

/**
 * Starts today's bill generation and sending, once the configured hour is reached and
 * today's sync ran to the end.
 *
 * It queues the same `generateBills` job the toolbar does, with `sendAfterwards` set, and
 * that job queues `sendBills` when it is done. The toolbar therefore shows an automatic run
 * with its progress, its result and its cancel button, exactly like one an operator started.
 *
 * @param runOwner the job id of the hourly task, so a duplicate worker execution of the same
 * job is recognised by the run lock; see `RunLockPort`.
 */
export async function runDailyBilling(
  payload: Payload,
  options: { runOwner: string; now?: Date | undefined },
): Promise<DailyBillingRunSummary> {
  // Two hourly jobs can exist when both replicas schedule one, and both would read the same
  // `lastRunAt` and queue the day's run twice. Imported lazily: the adapter reaches Redis,
  // which reads the validated environment at module load.
  const { RedisRunLockAdapter } =
    await import('@/features/billing/adapters/redis-run-lock.adapter');

  const lockResult = await new RedisRunLockAdapter().acquire(
    BillingTaskSlug.RunDailyBilling,
    RUN_LOCK_TTL_SECONDS,
    options.runOwner,
  );
  if (!lockResult.acquired) {
    // Whether it is this job on the other replica or a second job, the run holding the lock
    // decides for today and the next tick reads its `lastRunAt`.
    return { started: false, reason: 'Another daily-run decision is in progress.' };
  }

  try {
    const now = options.now ?? new Date();
    const settings = await payload.findGlobal({
      slug: 'bill-settings',
      context: { internal: true },
    });
    const config = settings.dailyBillingRun;

    const due = isDailyRunDue(config, now);
    if (!due.due) {
      payload.logger.debug(`Daily billing run not due: ${due.reason ?? ''}`);
      return { started: false, reason: due.reason };
    }

    const [sync, generate, send] = await Promise.all([
      findLatestJob(payload, BillingTaskSlug.SyncParticipants, now),
      findLatestJob(payload, BillingTaskSlug.GenerateBills, now),
      findLatestJob(payload, BillingTaskSlug.SendBills, now),
    ]);
    const blocker = findPipelineBlocker({ sync, generate, send }, now);
    if (blocker !== undefined) {
      // At most once an hour, and only on a day the pipeline is in trouble.
      payload.logger.info(`Daily billing run waiting: ${blocker} Checking again next hour.`);
      return { started: false, reason: blocker };
    }

    const job = await payload.jobs.queue({
      task: BillingTaskSlug.GenerateBills,
      input: { sendAfterwards: true },
    });

    // Written after the queue on purpose: a failed write costs a second run, which only
    // bills and mails what is still open, while a failed queue after the write would cost
    // the whole day.
    await payload.updateGlobal({
      slug: 'bill-settings',
      context: { internal: true },
      data: { dailyBillingRun: { ...config, lastRunAt: now.toISOString() } },
    });

    payload.logger.info(`Daily billing run queued bill generation as job ${String(job.id)}.`);
    return { started: true, generateJobId: String(job.id) };
  } finally {
    await lockResult.lock.release();
  }
}
