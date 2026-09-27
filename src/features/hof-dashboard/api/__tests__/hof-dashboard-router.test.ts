import type { Context } from '@/trpc/init';
import { createCallerFactory } from '@/trpc/init';

const mockData = jest.fn();
const mockWithdraw = jest.fn();
const mockReview = jest.fn();

const HOEFE = [
  { id: 'hof-nord', name: 'Hof Nord', groupId: '990001' },
  { id: 'hof-sued', name: 'Hof Süd', groupId: '990002' },
];

/** Hof Nord's address administrator, as the login stored their Cevi.DB roles. */
const mockPayload = {
  findByID: jest.fn(() =>
    Promise.resolve({
      groups: [{ id: 990_001, role_class: 'Group::Ortsgruppe::AdministratorCeviDB' }],
    }),
  ),
  find: jest.fn(({ where }: { where?: { groupId: { in: string[] } } }) =>
    Promise.resolve({
      docs: HOEFE.filter((hof) => where === undefined || where.groupId.in.includes(hof.groupId)),
    }),
  ),
};

jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({ getPayload: (): Promise<unknown> => Promise.resolve(mockPayload) }));
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({ debug: jest.fn(), warn: jest.fn() }),
}));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: jest.fn().mockResolvedValue('de'),
}));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    FEATURE_ENABLE_HOF_DASHBOARD: true,
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [542],
    CEVIDB_GROUP_TRANSLATION_TEAM: [543],
    CEVIDB_GROUP_PROGRAM_TEAM: [544],
  },
}));
jest.mock('@/features/hof-dashboard/api/hof-dashboard-data', () => ({
  getHofDashboardData: (...parameters: unknown[]): unknown => mockData(...parameters),
}));
jest.mock('@/features/hof-dashboard/api/hof-dashboard-mutations', () => ({
  withdrawHofSubmission: (...parameters: unknown[]): unknown => mockWithdraw(...parameters),
  reviewHofSubmission: (...parameters: unknown[]): unknown => mockReview(...parameters),
}));
// see admin-router-access.test.ts: a direct caller never serializes anything
jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown): { json: unknown } => ({ json: value }),
    deserialize: (value: { json: unknown }): unknown => value.json,
  },
}));

import { hofDashboardRouter } from '@/features/hof-dashboard/api/hof-dashboard-router';

const createCaller = createCallerFactory(hofDashboardRouter);

const { environmentVariables } = jest.requireMock<{
  environmentVariables: { FEATURE_ENABLE_HOF_DASHBOARD: boolean };
}>('@/config/environment-variables');

const callerAs = (user?: unknown): ReturnType<typeof createCaller> =>
  createCaller({ user, prisma: {}, locale: 'de' } as unknown as Context);

const hofNordAdmin = callerAs({ uuid: 'user-8', group_ids: [990_001] });
// the session's name already reads "First Last v/o Cevi name"
const reviewer = callerAs({ uuid: 'web-1', name: 'Sara Keller v/o Biber', group_ids: [542] });

beforeEach(() => {
  jest.clearAllMocks();
  environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD = true;
  mockData.mockResolvedValue({ hof: { id: 'hof-sued', name: 'Hof Süd' } });
});

describe('hofDashboardRouter', () => {
  it('lists only the Höfe a Hof administrator administers', async () => {
    await expect(hofNordAdmin.getMyHofList()).resolves.toEqual([
      { id: 'hof-nord', name: 'Hof Nord' },
    ]);
  });

  it("refuses another Hof's dashboard before reading it", async () => {
    await expect(hofNordAdmin.getHofDashboard({ hofId: 'hof-sued' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockData).not.toHaveBeenCalled();
  });

  it("refuses to withdraw another Hof's submission before touching it", async () => {
    await expect(
      hofNordAdmin.deleteSubmission({ hofId: 'hof-sued', submissionId: 'sub-1' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockWithdraw).not.toHaveBeenCalled();
  });

  it('withdraws a submission of the own Hof', async () => {
    await hofNordAdmin.deleteSubmission({ hofId: 'hof-nord', submissionId: 'sub-1' });
    expect(mockWithdraw).toHaveBeenCalledWith({ id: 'hof-nord', name: 'Hof Nord' }, 'sub-1');
  });

  it('opens the own Hof in the language asked for, and not as a reviewer', async () => {
    await hofNordAdmin.getHofDashboard({ hofId: 'hof-nord', locale: 'fr' });
    expect(mockData).toHaveBeenCalledWith('hof-nord', 'fr', false);
  });

  it("falls back to the reader's language without one asked for", async () => {
    await hofNordAdmin.getHofDashboard({ hofId: 'hof-nord' });
    expect(mockData).toHaveBeenCalledWith('hof-nord', 'de', false);
  });

  it('lets a reviewer open any Hof, as a reviewer', async () => {
    await reviewer.getHofDashboard({ hofId: 'hof-sued' });
    expect(mockData).toHaveBeenCalledWith('hof-sued', 'de', true);
  });

  it('leaves the review to the reviewers, and withdrawing to the Hof', async () => {
    const review = { hofId: 'hof-nord', submissionId: 'plan-2', feedback: 'ok' };
    await expect(
      hofNordAdmin.updateSubmissionReview({ ...review, status: 'accepted' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      reviewer.deleteSubmission({ hofId: 'hof-nord', submissionId: 'plan-2' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockReview).not.toHaveBeenCalled();
    expect(mockWithdraw).not.toHaveBeenCalled();
  });

  it("stores a reviewer's status and feedback, signed with their name", async () => {
    await reviewer.updateSubmissionReview({
      hofId: 'hof-sued',
      submissionId: 'sued-plan',
      status: 'revisionRequired',
      feedback: 'Bitte ergänzen',
    });
    expect(mockReview).toHaveBeenCalledWith({
      hof: { id: 'hof-sued', name: 'Hof Süd' },
      submissionId: 'sued-plan',
      status: 'revisionRequired',
      feedback: 'Bitte ergänzen',
      reviewer: { id: 'web-1', name: 'Sara Keller v/o Biber' },
    });
  });

  it('answers nothing of the dashboard while it is switched off', async () => {
    environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD = false;
    await expect(hofNordAdmin.getMyHofList()).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(hofNordAdmin.getHofDashboard({ hofId: 'hof-nord' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(
      hofNordAdmin.deleteSubmission({ hofId: 'hof-nord', submissionId: 'sub-1' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(mockData).not.toHaveBeenCalled();
    expect(mockWithdraw).not.toHaveBeenCalled();
  });

  it('still lists the Höfe for forms while the dashboard is switched off', async () => {
    environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD = false;
    await expect(callerAs().getHofList()).resolves.toHaveLength(2);
  });

  it('asks someone signed out to sign in', async () => {
    await expect(callerAs().getMyHofList()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(callerAs().getHofDashboard({ hofId: 'hof-nord' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    await expect(
      callerAs().deleteSubmission({ hofId: 'hof-nord', submissionId: 'sub-1' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(mockWithdraw).not.toHaveBeenCalled();
  });

  it('lets anyone list the Höfe by name for a form, signed in or not', async () => {
    await expect(callerAs().getHofList()).resolves.toEqual([
      { id: 'hof-nord', name: 'Hof Nord' },
      { id: 'hof-sued', name: 'Hof Süd' },
    ]);
  });
});
