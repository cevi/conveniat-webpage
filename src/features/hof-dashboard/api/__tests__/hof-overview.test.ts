const PAST = '2020-01-31T10:00:00.000Z';

const published = { published: true };
const asksForHof = [{ formSection: { fields: [{ blockType: 'hofSelection', name: 'hof' }] } }];

/** A plan handed in as versions, due in the past, still open. */
const planForm = {
  id: 'form-plan',
  title: 'Hofbauten',
  _localized_status: published,
  hofDashboard: { area: 'infrastructure', entries: 'versions', deadline: PAST },
  sections: asksForHof,
};

/** Stands of the Stadtleben: every submission counts on its own. */
const standForm = {
  id: 'form-stand',
  title: 'Stadtleben',
  _localized_status: published,
  hofDashboard: { area: 'program', entries: 'entries' },
  sections: asksForHof,
};

const orderForm = {
  id: 'form-order',
  title: 'Material',
  _localized_status: published,
  hofDashboard: { area: 'material', entries: 'versions' },
  sections: asksForHof,
};

interface Submission {
  id: string;
  form: string;
  hof: string;
  approved?: boolean;
  hofReviewStatus?: string;
  hofFinal?: boolean;
}

/** Newest first, as the query sorts them. */
let mockSubmissions: Submission[] = [];

const FILES = [
  { id: 'file-1', formSubmission: 'plan-1' },
  { id: 'file-2', formSubmission: 'stand-a' },
  { id: 'file-3', formSubmission: 'sued-other' },
];

type Clause = Record<string, { equals?: string; in?: string[] }>;

const matches = (document: Record<string, unknown>, clauses: Clause[]): boolean =>
  clauses.every((clause) =>
    Object.entries(clause).every(([field, condition]) => {
      const value = document[field] as string;
      if (condition.equals !== undefined) return value === condition.equals;
      return condition.in?.includes(value) ?? true;
    }),
  );

const mockPayload = {
  find: jest.fn(
    ({ collection, where }: { collection: string; where: Clause & { and?: Clause[] } }) => {
      if (collection === 'forms') {
        return Promise.resolve({ docs: [planForm, standForm, orderForm] });
      }
      const clauses = where.and ?? [where];
      const found = (collection === 'form-submissions' ? mockSubmissions : FILES).filter(
        (document) => matches(document as unknown as Record<string, unknown>, clauses),
      );
      return Promise.resolve({ docs: found, totalDocs: found.length });
    },
  ),
  update: jest.fn<Promise<unknown>, [unknown]>(() => Promise.resolve({})),
};

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

import { acceptHofArea } from '@/features/hof-dashboard/api/hof-dashboard-mutations';
import { getHofOverview } from '@/features/hof-dashboard/api/hof-overview';

const HOF_NORD = { id: 'hof-nord', name: 'Cevi Uster' };
const HOF_SUED = { id: 'hof-sued', name: 'Züri 11' };
const REVIEWER = { id: 'web-1', name: 'Sara Keller v/o Biber' };

beforeEach(() => {
  jest.clearAllMocks();
  mockSubmissions = [
    { id: 'plan-2', form: 'form-plan', hof: 'hof-nord', hofReviewStatus: 'inReview' },
    { id: 'plan-1', form: 'form-plan', hof: 'hof-nord', hofReviewStatus: 'revisionRequired' },
    { id: 'stand-b', form: 'form-stand', hof: 'hof-nord' },
    { id: 'stand-a', form: 'form-stand', hof: 'hof-nord', approved: true },
    { id: 'sued-other', form: 'form-contact', hof: 'hof-sued' },
  ];
});

describe('getHofOverview', () => {
  it('counts every area of every Hof as its own dashboard does', async () => {
    const [nord, sued] = await getHofOverview([HOF_NORD, HOF_SUED], 'de');

    expect(nord).toEqual({
      ...HOF_NORD,
      areas: {
        // only the newest version counts: in review, not the earlier one sent back
        infrastructure: { forms: 1, done: 1, overdue: 0, toReview: 1, toAccept: 1 },
        // every entry counts, and the accepted one needs nothing more
        program: { forms: 1, done: 1, overdue: 0, toReview: 1, toAccept: 1 },
        material: { forms: 1, done: 0, overdue: 0, toReview: 0, toAccept: 0 },
      },
      files: 2,
    });
    expect(sued).toEqual({
      ...HOF_SUED,
      areas: {
        infrastructure: { forms: 1, done: 0, overdue: 1, toReview: 0, toAccept: 0 },
        program: { forms: 1, done: 0, overdue: 0, toReview: 0, toAccept: 0 },
        material: { forms: 1, done: 0, overdue: 0, toReview: 0, toAccept: 0 },
      },
      // a file of a form not on the dashboard is not the Hof's to download here
      files: 0,
    });
  });
});

describe('acceptHofArea', () => {
  it('accepts the newest version and makes it final, and leaves the earlier one', async () => {
    await expect(
      acceptHofArea({ hof: HOF_NORD, area: 'infrastructure', locale: 'de', reviewer: REVIEWER }),
    ).resolves.toBe(1);
    expect(mockPayload.update.mock.calls.map(([options]) => options)).toEqual([
      expect.objectContaining({
        collection: 'form-submissions',
        id: 'plan-2',
        // eslint-disable-next-line unicorn/no-null -- Payload clears a field only with null
        data: { approved: true, hofReviewStatus: null, hofFinal: true },
        context: { hofReviewer: REVIEWER },
      }),
    ]);
  });

  it('accepts every entry not yet accepted, without making it final', async () => {
    await expect(
      acceptHofArea({ hof: HOF_NORD, area: 'program', locale: 'de', reviewer: REVIEWER }),
    ).resolves.toBe(1);
    expect(mockPayload.update.mock.calls.map(([options]) => options)).toEqual([
      expect.objectContaining({
        id: 'stand-b',
        // eslint-disable-next-line unicorn/no-null -- Payload clears a field only with null
        data: { approved: true, hofReviewStatus: null },
      }),
    ]);
  });

  it('changes nothing already accepted and final', async () => {
    mockSubmissions = [
      { id: 'plan-2', form: 'form-plan', hof: 'hof-nord', approved: true, hofFinal: true },
    ];
    await expect(
      acceptHofArea({ hof: HOF_NORD, area: 'infrastructure', locale: 'de', reviewer: REVIEWER }),
    ).resolves.toBe(0);
    expect(mockPayload.update).not.toHaveBeenCalled();
  });

  it("leaves another Hof's submissions alone", async () => {
    await expect(
      acceptHofArea({ hof: HOF_SUED, area: 'infrastructure', locale: 'de', reviewer: REVIEWER }),
    ).resolves.toBe(0);
    expect(mockPayload.update).not.toHaveBeenCalled();
  });
});
