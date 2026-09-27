interface StoredSubmission {
  id: string;
  form: string;
  hof: string;
  hofReviewStatus?: string | null;
  approved?: boolean | null;
  hofFinal?: boolean | null;
}

const SUBMISSIONS: Record<string, StoredSubmission> = {
  'plan-2': { id: 'plan-2', form: 'form-plan', hof: 'hof-nord' },
  'plan-1': { id: 'plan-1', form: 'form-plan', hof: 'hof-nord' },
  'plan-reviewed': {
    id: 'plan-reviewed',
    form: 'form-plan',
    hof: 'hof-nord',
    hofReviewStatus: 'inReview',
  },
  // marked final by the Ressort before it gave any status
  'order-final': { id: 'order-final', form: 'form-order', hof: 'hof-nord', hofFinal: true },
  'stand-old': { id: 'stand-old', form: 'form-stand', hof: 'hof-nord' },
  'stand-approved': { id: 'stand-approved', form: 'form-stand', hof: 'hof-nord', approved: true },
  'sued-plan': { id: 'sued-plan', form: 'form-plan', hof: 'hof-sued' },
  'unlinked-entry': { id: 'unlinked-entry', form: 'form-contact', hof: 'hof-nord' },
};

const FORMS: Record<string, unknown> = {
  'form-plan': { hofDashboard: { area: 'infrastructure', entries: 'versions' } },
  'form-stand': { hofDashboard: { area: 'program', entries: 'entries' } },
  'form-order': { hofDashboard: { area: 'material', entries: 'versions' } },
  // eslint-disable-next-line unicorn/no-null -- Payload stores an unset select as null
  'form-contact': { hofDashboard: { area: null } },
};

/** The newest submission of each form, as the sorted query answers it. */
let mockNewest: Record<string, string> = {};

const mockPayload = {
  findByID: jest.fn(({ collection, id }: { collection: string; id: string }) =>
    // eslint-disable-next-line unicorn/no-null -- findByID with disableErrors answers a missing document with null
    Promise.resolve((collection === 'forms' ? FORMS[id] : SUBMISSIONS[id]) ?? null),
  ),
  find: jest.fn(({ where }: { where: { and: { form?: { equals: string } }[] } }) => {
    const formId = where.and.find((clause) => clause.form !== undefined)?.form?.equals ?? '';
    const newest = mockNewest[formId];
    return Promise.resolve({ docs: newest === undefined ? [] : [{ id: newest }] });
  }),
  delete: jest.fn<Promise<unknown>, [unknown]>(() => Promise.resolve({ docs: [] })),
  update: jest.fn<Promise<unknown>, [unknown]>(() => Promise.resolve({})),
};

// the data module reads the access rules, which read the Cevi.DB groups from the environment
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { FEATURE_ENABLE_HOF_DASHBOARD: true },
}));
jest.mock('@payload-config', () => ({ default: {} }), { virtual: true });
jest.mock('payload', () => ({ getPayload: (): Promise<unknown> => Promise.resolve(mockPayload) }));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }),
}));

import {
  reviewHofSubmission,
  withdrawHofSubmission,
} from '@/features/hof-dashboard/api/hof-dashboard-mutations';

const HOF_NORD = { id: 'hof-nord', name: 'Hof Nord' };

const withdraw = (submissionId: string): Promise<void> =>
  withdrawHofSubmission(HOF_NORD, submissionId);

beforeEach(() => {
  jest.clearAllMocks();
  mockNewest = {
    'form-plan': 'plan-2',
    'form-stand': 'stand-approved',
    'form-order': 'order-final',
  };
});

describe('withdrawHofSubmission', () => {
  it('deletes the files first and then the submission', async () => {
    await withdraw('plan-2');
    expect(mockPayload.delete.mock.calls.map(([options]) => options)).toEqual([
      {
        collection: 'form_collection',
        where: { formSubmission: { equals: 'plan-2' } },
        overrideAccess: true,
      },
      { collection: 'form-submissions', id: 'plan-2', overrideAccess: true },
    ]);
  });

  it("answers another Hof's submission as a missing one", async () => {
    await expect(withdraw('sued-plan')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(mockPayload.delete).not.toHaveBeenCalled();
  });

  it('answers an unknown submission as a missing one', async () => {
    await expect(withdraw('nope')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(mockPayload.delete).not.toHaveBeenCalled();
  });

  it('does not withdraw a submission of a form off the dashboard', async () => {
    await expect(withdraw('unlinked-entry')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(mockPayload.delete).not.toHaveBeenCalled();
  });

  it.each([
    ['one the Ressort took up', 'plan-reviewed'],
    ['one approved for the website', 'stand-approved'],
    ['an earlier version', 'plan-1'],
    ['a version the Ressort marked final', 'order-final'],
  ])('keeps %s', async (_description, submissionId) => {
    await expect(withdraw(submissionId)).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(mockPayload.delete).not.toHaveBeenCalled();
  });

  it('withdraws an older entry of a form of entries', async () => {
    await withdraw('stand-old');
    expect(mockPayload.delete).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'form-submissions', id: 'stand-old' }),
    );
  });
});

describe('reviewHofSubmission', () => {
  /** A web core team member answering on the dashboard. */
  const REVIEWER = { id: 'web-1', name: 'Sara Keller v/o Biber' };

  it('stores the status and the feedback the Hof reads, naming who wrote them', async () => {
    await reviewHofSubmission({
      hof: HOF_NORD,
      submissionId: 'plan-2',
      status: 'revisionRequired',
      feedback: 'Masthöhe fehlt',
      final: false,
      reviewer: REVIEWER,
    });
    expect(mockPayload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'form-submissions',
        id: 'plan-2',
        data: {
          approved: false,
          hofReviewStatus: 'revisionRequired',
          hofFeedback: 'Masthöhe fehlt',
          hofFinal: false,
        },
        // the local API has no user, so the review history learns the reviewer from here
        context: { hofReviewer: REVIEWER },
      }),
    );
  });

  it('puts a submission back to handed in without a status', async () => {
    await reviewHofSubmission({
      hof: HOF_NORD,
      submissionId: 'plan-reviewed',
      status: undefined,
      feedback: '',
      final: false,
      reviewer: REVIEWER,
    });
    expect(mockPayload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line unicorn/no-null -- Payload clears a field only with null
        data: { approved: false, hofReviewStatus: null, hofFeedback: '', hofFinal: false },
      }),
    );
  });

  it("accepts it as the form builder's approval, and takes the approval back again", async () => {
    await reviewHofSubmission({
      hof: HOF_NORD,
      submissionId: 'stand-old',
      status: 'accepted',
      feedback: 'Super',
      final: false,
      reviewer: REVIEWER,
    });
    expect(mockPayload.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        // accepted has no status of its own: an earlier one would outlive the approval
        // eslint-disable-next-line unicorn/no-null -- Payload clears a field only with null
        data: { approved: true, hofReviewStatus: null, hofFeedback: 'Super', hofFinal: false },
      }),
    );

    await reviewHofSubmission({
      hof: HOF_NORD,
      submissionId: 'stand-approved',
      status: 'inReview',
      feedback: '',
      final: false,
      reviewer: REVIEWER,
    });
    expect(mockPayload.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: { approved: false, hofReviewStatus: 'inReview', hofFeedback: '', hofFinal: false },
      }),
    );
  });

  it('marks a version final, so the Hof hands in no further one', async () => {
    await reviewHofSubmission({
      hof: HOF_NORD,
      submissionId: 'plan-2',
      status: 'accepted',
      feedback: '',
      final: true,
      reviewer: REVIEWER,
    });
    const [options] = mockPayload.update.mock.calls[0] ?? [];
    expect((options as { data?: unknown } | undefined)?.data).toMatchObject({
      approved: true,
      hofFinal: true,
    });
  });

  it.each([
    ["another Hof's submission", 'sued-plan'],
    ['a submission of a form off the dashboard', 'unlinked-entry'],
  ])('does not answer %s', async (_description, submissionId) => {
    await expect(
      reviewHofSubmission({
        hof: HOF_NORD,
        submissionId,
        status: 'accepted',
        feedback: '',
        final: false,
        reviewer: REVIEWER,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(mockPayload.update).not.toHaveBeenCalled();
  });
});
