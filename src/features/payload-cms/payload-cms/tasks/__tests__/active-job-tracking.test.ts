import {
  getRunningJobId,
  withActiveJobTracking,
  withActiveWorkflowTracking,
} from '@/features/payload-cms/payload-cms/tasks/active-job-tracking';
import type { JobsConfig } from 'payload';

type JobTask = NonNullable<JobsConfig['tasks']>[number];
type JobWorkflow = NonNullable<JobsConfig['workflows']>[number];

/**
 * Payload hands a handler the whole run context. The tracking reads `job.id` and nothing else,
 * so that is all these tests build.
 */
const runTask = async (task: JobTask, jobId: string): Promise<unknown> => {
  const handler = task.handler as (arguments_: { job: { id: string } }) => Promise<unknown>;
  return handler({ job: { id: jobId } });
};

const runWorkflow = async (workflow: JobWorkflow, jobId: string): Promise<unknown> => {
  const handler = workflow.handler as (arguments_: { job: { id: string } }) => Promise<unknown>;
  return handler({ job: { id: jobId } });
};

const task = (handler: () => unknown): JobTask =>
  ({ slug: 'syncParticipants', handler: () => Promise.resolve(handler()) }) as unknown as JobTask;

describe('withActiveJobTracking', () => {
  it('names the job while its handler runs and nothing once it is done', async () => {
    let idWhileRunning: string | undefined;
    const tracked = withActiveJobTracking(
      task(() => {
        idWhileRunning = getRunningJobId();
        return { output: {} };
      }),
    );

    await runTask(tracked, 'job-1');

    expect(idWhileRunning).toBe('job-1');
    expect(getRunningJobId()).toBeUndefined();
  });

  it('forgets a job whose handler threw', async () => {
    const tracked = withActiveJobTracking(
      task(() => Promise.reject(new Error('Hitobito is down'))),
    );

    // A failed job is retried or given up on by the queue. Leaving its id behind would make the
    // worker claim forever that it is busy with it, and the stale-job cleanup would then never
    // touch the one job it exists for.
    await expect(runTask(tracked, 'job-2')).rejects.toThrow('Hitobito is down');
    expect(getRunningJobId()).toBeUndefined();
  });

  it('passes the handler result through', async () => {
    const tracked = withActiveJobTracking(task(() => ({ output: { checkedOut: 3 } })));

    await expect(runTask(tracked, 'job-3')).resolves.toEqual({ output: { checkedOut: 3 } });
  });

  it('leaves a task alone whose handler is a file path', () => {
    const fileBacked = { slug: 'syncParticipants', handler: './handler.ts' } as unknown as JobTask;

    expect(withActiveJobTracking(fileBacked)).toBe(fileBacked);
  });

  it('reports the job it has been running the longest', async () => {
    let releaseSlowJob: (() => void) | undefined;
    const slowJobFinished = new Promise<void>((resolve) => {
      releaseSlowJob = resolve;
    });
    const slowJob = runTask(withActiveJobTracking(task(() => slowJobFinished)), 'job-slow');

    let idDuringQuickJob: string | undefined;
    await runTask(
      withActiveJobTracking(
        task(() => {
          idDuringQuickJob = getRunningJobId();
          return { output: {} };
        }),
      ),
      'job-quick',
    );
    releaseSlowJob?.();
    await slowJob;

    // The worker publishes a single job id, and a cleanup only ever looks at jobs that have been
    // running for minutes. The oldest one is the only candidate.
    expect(idDuringQuickJob).toBe('job-slow');
    expect(getRunningJobId()).toBeUndefined();
  });
});

describe('withActiveWorkflowTracking', () => {
  it('keeps naming the workflow while a step of it finishes', async () => {
    const step = withActiveJobTracking(task(() => ({ output: {} })));
    let idAfterStep: string | undefined;
    const workflow = {
      slug: 'registrationWorkflow',
      handler: async ({ job }: { job: { id: string } }) => {
        // A step is handed the id of the workflow's job, not one of its own.
        await runTask(step, job.id);
        idAfterStep = getRunningJobId();
      },
    } as unknown as JobWorkflow;

    await runWorkflow(withActiveWorkflowTracking(workflow), 'job-workflow');

    expect(idAfterStep).toBe('job-workflow');
    expect(getRunningJobId()).toBeUndefined();
  });

  it('leaves a workflow alone that is defined as a list of steps', () => {
    const jsonWorkflow = { slug: 'registrationWorkflow', handler: [] } as unknown as JobWorkflow;

    expect(withActiveWorkflowTracking(jsonWorkflow)).toBe(jsonWorkflow);
  });
});
