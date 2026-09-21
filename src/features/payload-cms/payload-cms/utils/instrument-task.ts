import { withSpan } from '@/utils/tracing-helpers';
import type { Attributes, Histogram } from '@opentelemetry/api';
import { metrics, ValueType } from '@opentelemetry/api';
import type { JobsConfig, TaskConfig, TaskHandlerResult, TypedJobs } from 'payload';

/**
 * The structural half of Payload's own `TaskConfig` type parameter. Payload does not export
 * `TaskInputOutput` from its entry point, and it is this shape.
 */
interface TaskInputOutput {
  input: object;
  output: object;
}

/**
 * How a single task run ended. A small fixed set, so a failure loop cannot explode
 * the series cardinality of the histogram below.
 */
type TaskOutcome = 'error' | 'success';

/**
 * The duration histogram, created on first use rather than at module scope.
 *
 * `metrics.getMeter()` resolves the global MeterProvider at the moment it is called, and the
 * metrics API keeps no proxy standing in for a provider that is not registered yet — see the
 * comment on `startRuntimeMetrics` in `src/tracing.ts`. This module is imported by
 * `payload.config.ts`, which is evaluated while the SDK is still starting, so binding the meter
 * eagerly would attach it to the no-op provider and drop every series for the life of the
 * process. The first task run happens long after `sdk.start()`.
 */
let durationHistogram: Histogram | undefined;

const getDurationHistogram = (): Histogram => {
  // The unit lives in the metric name rather than the `unit` field: exporters may append a
  // unit suffix, and a name that shifts under us silently breaks every dashboard panel.
  durationHistogram ??= metrics
    .getMeter('payload-jobs')
    .createHistogram('payload_job_duration_seconds', {
      description: 'How long a Payload job task ran, in seconds, by task slug and outcome',
      valueType: ValueType.DOUBLE,
    });
  return durationHistogram;
};

/** Reads a string field off the job document without trusting its shape. */
const readJobField = (job: unknown, field: string): string | undefined => {
  if (typeof job !== 'object' || job === null) return undefined;
  const value = (job as Record<string, unknown>)[field];
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
};

/**
 * Wraps a task handler so every run reports itself: one span, one duration sample and a log
 * line at each end.
 *
 * Without this the 16 registered tasks are invisible in Tempo and Prometheus, and the only
 * evidence a run happened at all is Payload's own `Running N jobs.` line. Applied once where
 * the tasks are registered rather than in each task, so a new task is instrumented by being
 * added to the array.
 *
 * Handlers given as a string path are returned untouched: Payload imports those lazily in the
 * job runner and there is no function here to wrap.
 *
 * @param task The task configuration to instrument.
 * @returns The same configuration with an instrumented handler.
 */
export const instrumentTask = <
  TTaskSlugOrInputOutput extends keyof TypedJobs['tasks'] | TaskInputOutput,
>(
  task: TaskConfig<TTaskSlugOrInputOutput>,
): TaskConfig<TTaskSlugOrInputOutput> => {
  const { handler } = task;
  if (typeof handler === 'string') return task;

  const { slug } = task;

  return {
    ...task,
    handler: async (arguments_): Promise<TaskHandlerResult<TTaskSlugOrInputOutput>> => {
      const { job, req } = arguments_;
      const jobId = readJobField(job, 'id');
      const queue = readJobField(job, 'queue');

      const logFields = { jobSlug: slug, jobId };
      const attributes: Attributes = {
        'job.slug': slug,
        'job.id': jobId ?? '',
        ...(queue === undefined ? {} : { 'job.queue': queue }),
      };

      req.payload.logger.debug(logFields, 'Task run started');

      // Task handlers do not render, so creating a span here cannot abort a prerender pass —
      // see the scope discussion in `withSpan`.
      const startedAt = Date.now();
      const record = (outcome: TaskOutcome): number => {
        const durationSeconds = (Date.now() - startedAt) / 1000;
        getDurationHistogram().record(durationSeconds, {
          'job.slug': slug,
          'job.outcome': outcome,
        });
        return durationSeconds;
      };

      try {
        const result = await withSpan(
          `job.${slug}`,
          async () => await handler(arguments_),
          attributes,
        );
        req.payload.logger.debug(
          { ...logFields, durationSeconds: record('success') },
          'Task run succeeded',
        );
        return result;
      } catch (error) {
        req.payload.logger.error(
          { ...logFields, durationSeconds: record('error'), err: error },
          'Task run failed',
        );
        // Re-thrown unchanged: Payload decides from this whether to retry the task.
        throw error;
      }
    },
  };
};

/**
 * Instruments a whole `jobs.tasks` array, so that registering a task is the only thing needed
 * to get it traced.
 *
 * Separate from `instrumentTask` because the array mixes task configurations with different
 * input and output types, and a generic call cannot be inferred from that union. The parameter
 * type is taken from Payload's own `JobsConfig`, which is where the result goes.
 *
 * @param tasks The task configurations registered in the Payload config.
 * @returns The same configurations with instrumented handlers.
 */
export const instrumentTasks = (
  tasks: NonNullable<JobsConfig['tasks']>,
): NonNullable<JobsConfig['tasks']> => tasks.map((task) => instrumentTask(task));
