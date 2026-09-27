import type { Context } from '@/trpc/init';
import { createCallerFactory } from '@/trpc/init';

const mockData = jest.fn();
const mockUploadUrl = jest.fn();
const mockCompleteUpload = jest.fn();
const mockSafetyRisk = jest.fn();
const mockMaterialOrder = jest.fn();

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
  createHofUploadUrl: (...parameters: unknown[]): unknown => mockUploadUrl(...parameters),
  completeHofUpload: (...parameters: unknown[]): unknown => mockCompleteUpload(...parameters),
  updateHofSafetyRisk: (...parameters: unknown[]): unknown => mockSafetyRisk(...parameters),
  updateHofMaterialOrder: (...parameters: unknown[]): unknown => mockMaterialOrder(...parameters),
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
const reviewer = callerAs({ uuid: 'web-1', group_ids: [542] });

/** Every write of the dashboard, aimed at Hof Süd. */
const writesToSued = (
  caller: ReturnType<typeof createCaller>,
): Record<string, () => Promise<unknown>> => ({
  createUploadUrl: () =>
    caller.createUploadUrl({ hofId: 'hof-sued', filename: 'Plan.pdf', size: 1000 }),
  completeUpload: () =>
    caller.completeUpload({
      hofId: 'hof-sued',
      submissionType: 'flagpole',
      kind: 'plan',
      key: 'temp/hof-dashboard/hof-sued/abc-Plan.pdf',
      filename: 'Plan.pdf',
    }),
  updateSafetyRisk: () =>
    caller.updateSafetyRisk({
      hofId: 'hof-sued',
      submissionType: 'flagpole',
      elevatedSafetyRisk: 'yes',
    }),
  updateMaterialOrder: () =>
    caller.updateMaterialOrder({
      hofId: 'hof-sued',
      orderType: 'infrastructure',
      quantities: [{ itemId: 'rope', quantity: 3 }],
      powerConnection: false,
    }),
});

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

  it("refuses another Hof's dashboard", async () => {
    await expect(hofNordAdmin.getHofDashboard({ hofId: 'hof-sued' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockData).not.toHaveBeenCalled();
  });

  it.each(Object.keys(writesToSued(hofNordAdmin)))(
    'refuses %s for another Hof before writing anything',
    async (procedure) => {
      await expect(writesToSued(hofNordAdmin)[procedure]?.()).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
      for (const write of [mockUploadUrl, mockCompleteUpload, mockSafetyRisk, mockMaterialOrder]) {
        expect(write).not.toHaveBeenCalled();
      }
    },
  );

  it('lets a reviewer open any Hof, and says so', async () => {
    await expect(reviewer.getHofDashboard({ hofId: 'hof-sued' })).resolves.toMatchObject({
      isReviewer: true,
    });
  });

  it('answers nothing of the dashboard while it is switched off', async () => {
    environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD = false;
    await expect(hofNordAdmin.getMyHofList()).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(hofNordAdmin.getHofDashboard({ hofId: 'hof-nord' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('still lists the Höfe for forms while the dashboard is switched off', async () => {
    environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD = false;
    await expect(callerAs().getHofList()).resolves.toHaveLength(2);
  });

  it('asks someone signed out to sign in', async () => {
    await expect(callerAs().getMyHofList()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });
});
