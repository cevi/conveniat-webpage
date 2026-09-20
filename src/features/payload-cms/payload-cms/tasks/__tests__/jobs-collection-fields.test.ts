import type { ArrayField, Field, TabsField } from 'payload';

jest.mock('@/utils/server-logger', () => {
  const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };
  return { createLogger: (): typeof logger => logger, __logger: logger };
});

const { __logger: mockLogger } = jest.requireMock<{ __logger: { error: jest.Mock } }>(
  '@/utils/server-logger',
);

import { makeJobLogErrorOptional } from '@/features/payload-cms/payload-cms/tasks/jobs-collection-fields';

/**
 * The shape Payload builds for the jobs collection: the task log is an array inside the
 * `Status` tab, and its `error` is declared required even though only a failed entry has one.
 */
const defaultJobsFields = (): Field[] => [
  { name: 'input', type: 'json' },
  {
    type: 'tabs',
    tabs: [
      {
        label: 'Status',
        fields: [
          { name: 'completedAt', type: 'date' },
          { name: 'error', type: 'json' },
          {
            name: 'log',
            type: 'array',
            fields: [
              { name: 'taskID', type: 'text', required: true },
              { name: 'state', type: 'radio', options: ['failed', 'succeeded'], required: true },
              { name: 'error', type: 'json', required: true },
            ],
          },
        ],
      },
    ],
  },
];

const logFields = (fields: Field[]): Field[] => {
  const tabs = fields.find((field): field is TabsField => field.type === 'tabs');
  const log = tabs?.tabs[0]?.fields.find(
    (field): field is ArrayField => 'name' in field && field.name === 'log',
  );
  return log?.fields ?? [];
};

describe('makeJobLogErrorOptional', () => {
  beforeEach(() => {
    mockLogger.error.mockClear();
  });

  it('lets a log entry without an error through', () => {
    const error = logFields(makeJobLogErrorOptional(defaultJobsFields())).find(
      (field) => 'name' in field && field.name === 'error',
    );

    expect(error).toMatchObject({ name: 'error', required: false });
  });

  it('leaves the rest of a log entry required', () => {
    const fields = logFields(makeJobLogErrorOptional(defaultJobsFields()));

    expect(fields.filter((field) => 'required' in field && field.required === true)).toHaveLength(
      2,
    );
  });

  it('leaves the job-level error alone', () => {
    // It carries the same name as the one inside the log, one level up, and is the field a
    // failed job is read for.
    const original = defaultJobsFields();
    const tabs = makeJobLogErrorOptional(original).find(
      (field): field is TabsField => field.type === 'tabs',
    );
    const originalTabs = original.find((field): field is TabsField => field.type === 'tabs');

    expect(tabs?.tabs[0]?.fields[1]).toEqual(originalTabs?.tabs[0]?.fields[1]);
  });

  it('says so when Payload has moved the field', () => {
    // Silence here would put every finished job back to failing on its own bookkeeping, and
    // the task log is the last place anyone looks.
    makeJobLogErrorOptional([{ name: 'input', type: 'json' }]);

    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Status > Log'));
  });

  it('stays quiet when the field is where it is expected', () => {
    makeJobLogErrorOptional(defaultJobsFields());

    expect(mockLogger.error).not.toHaveBeenCalled();
  });
});
