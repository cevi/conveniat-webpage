import {
  announceRunningJobsWith,
  getRunningJobIds,
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
    let idsWhileRunning: string[] = [];
    const tracked = withActiveJobTracking(
      task(() => {
        idsWhileRunning = getRunningJobIds();
        return { output: {} };
      }),
    );

    await runTask(tracked, 'job-1');

    expect(idsWhileRunning).toEqual(['job-1']);
    expect(getRunningJobIds()).toEqual([]);
  });

  it('forgets a job whose handler threw', async () => {
    const tracked = withActiveJobTracking(
      task(() => Promise.reject(new Error('Hitobito is down'))),
    );

    // A failed job is retried or given up on by the queue. Leaving its id behind would make the
    // worker claim forever that it is busy with it, and the stale-job cleanup would then never
    // touch the one job it exists for.
    await expect(runTask(tracked, 'job-2')).rejects.toThrow('Hitobito is down');
    expect(getRunningJobIds()).toEqual([]);
  });

  it('passes the handler result through', async () => {
    const tracked = withActiveJobTracking(task(() => ({ output: { checkedOut: 3 } })));

    await expect(runTask(tracked, 'job-3')).resolves.toEqual({ output: { checkedOut: 3 } });
  });

  it('leaves a task alone whose handler is a file path', () => {
    const fileBacked = { slug: 'syncParticipants', handler: './handler.ts' } as unknown as JobTask;

    expect(withActiveJobTracking(fileBacked)).toBe(fileBacked);
  });

  it('names every job of an overlapping batch', async () => {
    let releaseSlowJob: (() => void) | undefined;
    const slowJobFinished = new Promise<void>((resolve) => {
      releaseSlowJob = resolve;
    });
    const slowJob = runTask(withActiveJobTracking(task(() => slowJobFinished)), 'job-slow');

    let idsDuringQuickJob: string[] = [];
    await runTask(
      withActiveJobTracking(
        task(() => {
          idsDuringQuickJob = getRunningJobIds();
          return { output: {} };
        }),
      ),
      'job-quick',
    );

    // A queue poll starts up to ten jobs at once. Publishing only the oldest would leave the
    // stale-job cleanup free to delete the other nine while they run.
    expect(idsDuringQuickJob).toEqual(['job-slow', 'job-quick']);

    releaseSlowJob?.();
    await slowJob;
    expect(getRunningJobIds()).toEqual([]);
  });

  it('announces a job that starts, and only once for a batch that starts together', async () => {
    const announce = jest.fn();
    announceRunningJobsWith(announce);
    let releaseJobs: (() => void) | undefined;
    const jobsFinished = new Promise<void>((resolve) => {
      releaseJobs = resolve;
    });
    const tracked = withActiveJobTracking(task(() => jobsFinished));

    const running = [runTask(tracked, 'job-a'), runTask(tracked, 'job-b')];

    // The claim has to be published before the next cleanup pass, which is ten seconds away,
    // not on the next 30-second heartbeat.
    expect(announce).toHaveBeenCalledTimes(2);

    releaseJobs?.();
    await Promise.all(running);
  });
});

describe('withActiveWorkflowTracking', () => {
  it('keeps naming the workflow while a step of it finishes', async () => {
    const step = withActiveJobTracking(task(() => ({ output: {} })));
    let idAfterStep: string[] = [];
    const workflow = {
      slug: 'registrationWorkflow',
      handler: async ({ job }: { job: { id: string } }) => {
        // A step is handed the id of the workflow's job, not one of its own.
        await runTask(step, job.id);
        idAfterStep = getRunningJobIds();
      },
    } as unknown as JobWorkflow;

    await runWorkflow(withActiveWorkflowTracking(workflow), 'job-workflow');

    expect(idAfterStep).toEqual(['job-workflow']);
    expect(getRunningJobIds()).toEqual([]);
  });

  it('leaves a workflow alone that is defined as a list of steps', () => {
    const jsonWorkflow = { slug: 'registrationWorkflow', handler: [] } as unknown as JobWorkflow;

    expect(withActiveWorkflowTracking(jsonWorkflow)).toBe(jsonWorkflow);
  });
});
