jest.mock('@payload-config', () => ({ default: {} }), { virtual: true });
jest.mock('payload', () => ({ getPayload: jest.fn().mockResolvedValue({}) }));

const mockListAvpHoefe = jest.fn();
jest.mock('@/features/payload-cms/payload-cms/access-rules/accessible-hoefe', () => ({
  listAvpHoefe: (...arguments_: unknown[]): unknown => mockListAvpHoefe(...arguments_),
}));

const mockShifts = jest.fn();
const mockQuotas = jest.fn();
const mockEnrolments = jest.fn();
jest.mock('@/features/payload-cms/payload-cms/utils/hof-shift-quotas', () => ({
  listQuotaShifts: (): unknown => mockShifts(),
  loadQuotas: (hofIds: string[]): unknown => mockQuotas(hofIds),
  listHofEnrolments: (hofIds: string[]): unknown => mockEnrolments(hofIds),
}));

import { getHofShiftOverview } from '@/features/schedule/api/hof-shift-overview';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';

const avp = { uuid: 'avp-1' } as HitobitoNextAuthUser;
const USTER = { id: 'uster', name: 'Cevi Uster' };
const ZUERI = { id: 'zueri', name: 'Züri 11' };

const enrolment = (
  shiftId: string,
  userName: string,
  createdAt: string,
): Record<string, unknown> => ({
  hofId: 'uster',
  shiftId,
  userId: userName,
  userName,
  createdAt: new Date(createdAt),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockShifts.mockResolvedValue([
    { id: 'abwasch', title: 'Abwasch', day: '2027-07-26', time: '18:30 - 21:00', places: 6 },
    { id: 'verkehr', title: 'Verkehrsdienst', day: '2027-07-26', time: '09:00 - 12:00', places: 4 },
    { id: 'infostand', title: 'Infostand', day: '2027-07-27', time: '15:00 - 18:00', places: 2 },
  ]);
  mockQuotas.mockResolvedValue(
    new Map([
      [
        'uster',
        new Map([
          ['2027-07-26', 3],
          ['2027-07-28', 2],
        ]),
      ],
    ]),
  );
  mockEnrolments.mockResolvedValue([
    enrolment('abwasch', 'Mira v/o Pixel', '2027-06-12T12:32:00Z'),
    enrolment('verkehr', 'Lucas v/o Fuchs', '2027-06-20T08:00:00Z'),
    enrolment('infostand', 'Jolien', '2027-07-01T19:00:00Z'),
    enrolment('deleted-shift', 'Ghost', '2027-07-02T19:00:00Z'),
  ]);
});

describe('what the AVP sees of their Hof', () => {
  it('shows nothing to someone who is AVP of no Hof', async () => {
    mockListAvpHoefe.mockResolvedValue([]);

    await expect(getHofShiftOverview(avp)).resolves.toEqual({ hoefe: [], days: [] });
    expect(mockEnrolments).not.toHaveBeenCalled();
  });

  it('counts the enrolments of each day against its quota, with who enrolled when', async () => {
    mockListAvpHoefe.mockResolvedValue([USTER]);

    const overview = await getHofShiftOverview(avp);

    expect(overview.hofId).toBe('uster');
    expect(overview.days.map(({ day, quota, enrolled }) => ({ day, quota, enrolled }))).toEqual([
      { day: '2027-07-26', quota: 3, enrolled: 2 },
      // a day with enrolments and no quota still shows who comes
      { day: '2027-07-27', enrolled: 1 },
      // a day with a quota and nobody yet shows what is missing
      { day: '2027-07-28', quota: 2, enrolled: 0 },
    ]);
    // the earlier shift of the day first, with the enrolment time
    expect(overview.days[0]?.people).toEqual([
      expect.objectContaining({ name: 'Lucas v/o Fuchs', shiftTitle: 'Verkehrsdienst' }),
      expect.objectContaining({ name: 'Mira v/o Pixel', enrolledAt: '2027-06-12T12:32:00.000Z' }),
    ]);
  });

  it('shows the chosen one of several Höfe, and never a Hof the user is not AVP of', async () => {
    mockListAvpHoefe.mockResolvedValue([USTER, ZUERI]);

    const chosen = await getHofShiftOverview(avp, 'zueri');
    const foreign = await getHofShiftOverview(avp, 'cevi-bern');

    expect(chosen.hofId).toBe('zueri');
    expect(foreign.hofId).toBe('uster');
    expect(mockEnrolments).not.toHaveBeenCalledWith(['cevi-bern']);
  });
});
