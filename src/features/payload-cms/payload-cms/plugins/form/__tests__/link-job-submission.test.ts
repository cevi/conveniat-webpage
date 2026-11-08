import { linkJobSubmission } from '@/features/payload-cms/payload-cms/plugins/form/hooks/link-job-submission';
import type { FormSubmission } from '@/features/payload-cms/payload-types';
import type { CollectionBeforeChangeHook } from 'payload';

// `payload` ships ESM only, which Jest cannot require. The hook needs APIError and nothing else.
jest.mock('payload', () => ({
  APIError: class extends Error {
    constructor(
      message: string,
      readonly status: number,
      readonly data?: unknown,
    ) {
      super(message);
    }
  },
}));

const form = {
  sections: [
    {
      formSection: {
        fields: [
          {
            blockType: 'conditionedBlock',
            fields: [{ blockType: 'jobSelection', name: 'jobhauptlager' }],
          },
        ],
      },
    },
  ],
};

const JOBS: Record<string, unknown> = {
  sani: {
    id: 'sani',
    title: 'Mitarbeit in der Sanitätszentrale',
    dateRange: { startDate: '2027-07-21T12:00:00.000Z', endDate: '2027-08-05T12:00:00.000Z' },
    minDays: 5,
  },
  security: {
    id: 'security',
    title: 'Security Unterstützung',
    dateRange: { startDate: '2027-07-24T12:00:00.000Z', endDate: '2027-08-03T12:00:00.000Z' },
  },
};

const run = async (
  submissionData: { field: string; value: string }[],
): Promise<Partial<FormSubmission>> => {
  const findByID = jest.fn(({ collection, id }: { collection: string; id: string }) =>
    collection === 'forms' ? Promise.resolve(form) : Promise.resolve(JOBS[id]),
  );
  const hookArguments = {
    data: { form: 'form-1', submissionData },
    operation: 'create',
    req: { payload: { findByID, count: jest.fn() }, locale: 'de' },
  } as unknown as Parameters<CollectionBeforeChangeHook<FormSubmission>>[0];
  return (await linkJobSubmission(hookArguments)) as Partial<FormSubmission>;
};

const fieldErrors = async (submissionData: { field: string; value: string }[]): Promise<unknown> =>
  run(submissionData).then(
    () => 'accepted',
    (error: unknown) => (error as { data?: unknown }).data,
  );

describe('linkJobSubmission with a minimum duration', () => {
  it('keeps the days picked within the window next to the job', async () => {
    const data = await run([
      { field: 'jobhauptlager', value: 'sani' },
      { field: 'jobhauptlager_zeitraum', value: '2027-07-21 – 2027-07-25' },
    ]);
    expect(data['helper-jobs']).toEqual(['sani']);
    expect(data.submissionData).toEqual([
      { field: 'jobhauptlager', value: 'Mitarbeit in der Sanitätszentrale' },
      { field: 'jobhauptlager_zeitraum', value: '2027-07-21 – 2027-07-25' },
    ]);
  });

  it('asks for the days when they are missing', async () => {
    expect(await fieldErrors([{ field: 'jobhauptlager', value: 'sani' }])).toEqual([
      { field: 'jobhauptlager_zeitraum', message: 'required' },
    ]);
  });

  it.each([
    ['shorter than the minimum', '2027-07-21 – 2027-07-24'],
    ['before the window', '2027-07-20 – 2027-07-25'],
    ['after the window', '2027-08-01 – 2027-08-06'],
    ['in two parts', '2027-07-21 – 2027-07-25, 2027-07-28 – 2027-08-02'],
    ['not a range', 'ab Mitte Juli'],
  ])('refuses days %s', async (_case, value) => {
    expect(
      await fieldErrors([
        { field: 'jobhauptlager', value: 'sani' },
        { field: 'jobhauptlager_zeitraum', value },
      ]),
    ).toEqual([{ field: 'jobhauptlager_zeitraum', message: 'invalid_selection' }]);
  });

  it('drops days sent for a job that lasts its whole window', async () => {
    const data = await run([
      { field: 'jobhauptlager', value: 'security' },
      { field: 'jobhauptlager_zeitraum', value: '2027-07-24 – 2027-07-30' },
    ]);
    expect(data.submissionData).toEqual([
      { field: 'jobhauptlager', value: 'Security Unterstützung' },
    ]);
  });
});
