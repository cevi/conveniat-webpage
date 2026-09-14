import {
  cleanupCompletedScheduledJobs,
  cleanupStaleScheduledJobs,
  DEFAULT_QUEUE,
} from '@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs';
import { redis } from '@/lib/db/redis';
import type { PayloadRequest, TaskConfig } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

/**
 * Emails the weekly registration report.
 *
 * Queued every hour rather than weekly: Payload's schedule is a cron literal in code, so
 * a weekly cron here would pin the weekday and hour that an operator is supposed to be
 * able to change in Bill Settings. The task therefore wakes hourly and
 * `isReportDue` decides whether this is the configured slot — which also means a change
 * in the settings takes effect the same week rather than after a deploy.
 *
 * Distributed locking:
 * 1. Redis slot lock in `beforeSchedule` prevents multiple replicas from queuing duplicate jobs
 *    for the same hourly slot.
 * 2. Active job checks prevent queuing if a job is already queued or running.
 * 3. A run lock inside `sendWeeklyReport` ensures that if multiple executions ever race,
 *    only one sends emails.
 */
export const sendWeeklyReportTask: TaskConfig = {
  slug: 'sendWeeklyReport',
  retries: 0,
  inputSchema: [],
  schedule: [
    {
      cron: '0 5 * * * *',
      queue: DEFAULT_QUEUE,
      hooks: {
        beforeSchedule: async ({
          queueable,
          req,
        }): Promise<{ shouldSchedule: boolean; input: Record<string, never> }> => {
          // 1. Calculate the 1-hour slot lock to ensure only one instance schedules the job per slot in a cluster
          const periodMs = 60 * 60 * 1000;
          const currentSlot = Math.floor(Date.now() / periodMs) * periodMs;
          const lockKey = `sendWeeklyReport:schedule-lock:${currentSlot}`;
          const lockTtlMs = 55 * 60 * 1000; // 55 minutes lock duration for the 1-hour slot

          let hasLock = false;
          try {
            const result = await redis.set(lockKey, '1', 'PX', lockTtlMs, 'NX');
            hasLock = result === 'OK';
          } catch (error) {
            req.payload.logger.error({
              err: error instanceof Error ? error : new Error(String(error)),
              msg: 'Failed to acquire Redis scheduling lock for sendWeeklyReport. Falling back to DB checks.',
            });
            hasLock = true;
          }

          if (!hasLock) {
            req.payload.logger.debug(
              `sendWeeklyReport: slot ${currentSlot} already locked/scheduled for this 1h window. Skipping.`,
            );
            return {
              shouldSchedule: false,
              input: {},
            };
          }

          await cleanupCompletedScheduledJobs(req, 'sendWeeklyReport');
          await cleanupStaleScheduledJobs(req, 'sendWeeklyReport', 15);

          // 2. Prevent parallel execution: check if there is an active or runnable sendWeeklyReport job
          let runnableOrActiveJobs = 0;
          try {
            runnableOrActiveJobs = await countRunnableOrActiveJobsForQueue({
              queue: queueable.scheduleConfig.queue,
              req,
              taskSlug: 'sendWeeklyReport',
              onlyScheduled: true,
            });
          } catch (error) {
            req.payload.logger.warn({
              err: error instanceof Error ? error : new Error(String(error)),
              msg: 'Failed to count active sendWeeklyReport jobs. Proceeding with schedule since Redis slot lock was acquired.',
            });
            // We already hold the 1-hour Redis slot lock for this window, and sendWeeklyReport
            // enforces an execution-level run lock. Suppressing scheduling on a transient DB error
            // would cause the entire weekly report to be skipped for the week.
            return {
              shouldSchedule: true,
              input: {},
            };
          }

          if (runnableOrActiveJobs > 0) {
            req.payload.logger.info(
              `sendWeeklyReport: ${runnableOrActiveJobs} active or runnable jobs already exist. Skipping scheduling.`,
            );
            return {
              shouldSchedule: false,
              input: {},
            };
          }

          return {
            shouldSchedule: true,
            input: {},
          };
        },
      },
    },
  ],
  handler: async ({
    job,
    req,
  }: {
    job?: { id: number | string };
    req: PayloadRequest;
  }): Promise<{ output: Record<string, unknown> }> => {
    const { sendWeeklyReport } = await import('@/features/billing/services/send-weekly-report');
    const result = await sendWeeklyReport(req.payload, {
      runOwner: job ? String(job.id) : undefined,
    });
    return { output: { success: true, ...result } };
  },
};
