import { instrumentTask } from '@/features/payload-cms/payload-cms/utils/instrument-task';
import { metrics } from '@opentelemetry/api';
import type { TaskConfig, TaskHandler } from 'payload';

const record = jest.fn();
const createHistogram = jest.fn<{ record: typeof record }, [string, unknown]>(() => ({ record }));

const getMeter = jest.spyOn(metrics, 'getMeter').mockReturnValue({
  createHistogram,
} as unknown as ReturnType<typeof metrics.getMeter>);

const logger = { debug: jest.fn(), error: jest.fn() };

/** The subset of the handler arguments the wrapper reads. */
const handlerArguments = {
  input: {},
  job: { id: 'job-42', queue: 'default' },
  req: { payload: { logger } },
} as unknown as Parameters<TaskHandler<{ input: object; output: object }>>[0];

const buildTask = (
  handler: TaskHandler<{ input: object; output: object }>,
): TaskConfig<{ input: object; output: object }> => ({
  slug: 'demoTask',
  retries: 3,
  schedule: [{ cron: '*/5 * * * *', queue: 'default' }],
  handler,
});

describe('instrumentTask', () => {
  beforeEach(() => {
    // Deliberately not `clearAllMocks`: the histogram is created once per module and the
    // creation assertions below would then depend on test order.
    record.mockClear();
    logger.debug.mockClear();
    logger.error.mockClear();
  });

  it('keeps the rest of the task configuration untouched', () => {
    const task = buildTask(() => ({ output: {} }));
    const instrumented = instrumentTask(task);

    expect(instrumented.slug).toBe('demoTask');
    expect(instrumented.retries).toBe(3);
    expect(instrumented.schedule).toEqual(task.schedule);
    expect(instrumented.handler).not.toBe(task.handler);
  });

  it('returns a string handler unchanged, because there is nothing to wrap', () => {
    const task = { slug: 'demoTask', handler: 'path/to/handler' } as TaskConfig<{
      input: object;
      output: object;
    }>;

    expect(instrumentTask(task)).toBe(task);
  });

  it('passes the handler result through and records a success sample', async () => {
    const handler = jest.fn(() => ({ output: { done: true } }));
    const instrumented = instrumentTask(buildTask(handler));

    const result = await (instrumented.handler as TaskHandler<{ input: object; output: object }>)(
      handlerArguments,
    );

    expect(result).toEqual({ output: { done: true } });
    expect(handler).toHaveBeenCalledWith(handlerArguments);
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(expect.any(Number), {
      'job.slug': 'demoTask',
      'job.outcome': 'success',
    });
  });

  it('logs the slug and id as fields rather than interpolating them', async () => {
    const instrumented = instrumentTask(buildTask(() => ({ output: {} })));

    await (instrumented.handler as TaskHandler<{ input: object; output: object }>)(
      handlerArguments,
    );

    expect(logger.debug).toHaveBeenCalledWith(
      expect.objectContaining({ jobSlug: 'demoTask', jobId: 'job-42' }),
      'Task run started',
    );
    expect(logger.debug).toHaveBeenCalledWith(
      expect.objectContaining({ jobSlug: 'demoTask', jobId: 'job-42' }),
      'Task run succeeded',
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('re-throws the error, records an error sample and logs it', async () => {
    const failure = new Error('task blew up');
    const instrumented = instrumentTask(
      buildTask(() => {
        throw failure;
      }),
    );

    await expect(
      (instrumented.handler as TaskHandler<{ input: object; output: object }>)(handlerArguments),
    ).rejects.toBe(failure);

    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(expect.any(Number), {
      'job.slug': 'demoTask',
      'job.outcome': 'error',
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ jobSlug: 'demoTask', jobId: 'job-42', err: failure }),
      'Task run failed',
    );
  });

  it('creates the duration histogram once, lazily, on the payload-jobs meter', () => {
    expect(getMeter).toHaveBeenCalledWith('payload-jobs');
    expect(createHistogram).toHaveBeenCalledTimes(1);
    expect(createHistogram.mock.calls[0]?.[0]).toBe('payload_job_duration_seconds');
  });
});
