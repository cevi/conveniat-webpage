jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_HELPER_POOL: [112],
  },
}));

import type { HelperShift } from '@/features/payload-cms/payload-types';
import {
  addShiftWalkIn,
  getAttendanceWindow,
  getShiftRoster,
  setShiftAttendance,
} from '@/features/schedule/api/shift-roster';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';

const LEAD = { uuid: 'lead', group_ids: [] } as unknown as HitobitoNextAuthUser;
const HELPER_POOL = { uuid: 'pool', group_ids: [112] } as unknown as HitobitoNextAuthUser;
const HELPER = { uuid: 'helper', group_ids: [] } as unknown as HitobitoNextAuthUser;

/** Mo, 26 July 2027, 07:00–10:00 in Zurich (UTC+2). */
const shift = (overrides: Partial<HelperShift> = {}): HelperShift =>
  ({
    id: 'abwasch',
    title: 'Abwasch',
    organiser: ['lead'],
    timeslot: { date: '2027-07-26T10:00:00.000Z', time: '07:00 - 10:00' },
    ...overrides,
  }) as HelperShift;

const at = (iso: string): Date => new Date(iso);

const createPrisma = (): {
  prisma: Parameters<typeof setShiftAttendance>[0];
  updateMany: jest.Mock;
  upsert: jest.Mock;
} => {
  const updateMany = jest.fn().mockResolvedValue({ count: 1 });
  const upsert = jest.fn().mockResolvedValue({});
  return {
    updateMany,
    upsert,
    prisma: {
      enrollment: { updateMany, upsert, findMany: jest.fn().mockResolvedValue([]) },
      user: { findUnique: jest.fn().mockResolvedValue({ hofIds: ['uster'] }) },
    } as unknown as Parameters<typeof setShiftAttendance>[0],
  };
};

describe('the roster of a Schichteinsatz', () => {
  it('opens for marking 30 minutes before the start and closes a day after the end', () => {
    expect(getAttendanceWindow(shift())).toEqual({
      opensAt: at('2027-07-26T04:30:00.000Z'),
      closesAt: at('2027-07-27T08:00:00.000Z'),
    });
  });

  it('is read by the Schichtleitung and the Helferpool, and by no helper', async () => {
    const { prisma } = createPrisma();
    const payload = { find: jest.fn().mockResolvedValue({ docs: [] }) };

    await expect(getShiftRoster(prisma, payload, LEAD, shift())).resolves.toMatchObject({
      canMarkAnyTime: false,
    });
    await expect(getShiftRoster(prisma, payload, HELPER_POOL, shift())).resolves.toMatchObject({
      canMarkAnyTime: true,
    });
    await expect(getShiftRoster(prisma, payload, HELPER, shift())).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('lets the Schichtleitung mark who came while the shift runs', async () => {
    const { prisma, updateMany } = createPrisma();

    await setShiftAttendance(prisma, LEAD, shift(), 'p1', 'PRESENT', at('2027-07-26T06:00:00Z'));

    expect(updateMany).toHaveBeenCalledWith({
      where: { courseId: 'abwasch', courseType: 'SHIFT', userId: 'p1' },
      data: expect.objectContaining({ attendance: 'PRESENT', attendanceBy: 'lead' }) as unknown,
    });
  });

  it('refuses a mark of the Schichtleitung outside the window, with a reason it can show', async () => {
    const { prisma, updateMany } = createPrisma();

    await expect(
      setShiftAttendance(prisma, LEAD, shift(), 'p1', 'ABSENT', at('2027-07-28T06:00:00Z')),
    ).rejects.toMatchObject({ reason: 'attendanceWindowClosed' });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('lets the Helferpool correct a mark any time', async () => {
    const { prisma, updateMany } = createPrisma();

    await setShiftAttendance(prisma, HELPER_POOL, shift(), 'p1', null, at('2027-08-10T06:00:00Z'));

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ attendance: null }) as unknown,
      }),
    );
  });

  it('adds someone who came without enrolling as present, counting for their Hof', async () => {
    const { prisma, upsert } = createPrisma();

    await addShiftWalkIn(prisma, LEAD, shift(), 'walk-in', at('2027-07-26T06:00:00Z'));

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: 'walk-in',
          hofId: 'uster',
          addedOnSite: true,
          attendance: 'PRESENT',
        }) as unknown,
      }),
    );
  });

  it('keeps the roster of a shift that hides it from its Schichtleitung', async () => {
    const { prisma } = createPrisma();
    const payload = { find: jest.fn().mockResolvedValue({ docs: [] }) };

    await expect(
      getShiftRoster(prisma, payload, LEAD, shift({ hide_participant_list: true })),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
