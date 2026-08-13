import { CourseType } from '@/lib/prisma';
import type { Context } from '@/trpc/init';
import { createCallerFactory } from '@/trpc/init';
import { TRPCError } from '@trpc/server';

jest.mock('@payload-config', () => ({}), { virtual: true });

jest.mock('payload', () => ({
  getPayload: jest.fn(),
  NotFound: class NotFound extends Error {},
}));

jest.mock('@/lib/prisma', () => ({
  CourseType: {
    SHIFT: 'SHIFT',
    PROGRAM: 'PROGRAM',
  },
}));

jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@/utils/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { APP_HOST_URL: 'https://example.test' },
}));

// `superjson` ships untranspiled ESM and is only the wire transformer; a direct caller never
// serializes anything, so a stub keeps this suite out of the ESM transform allowlist.
jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown): { json: unknown } => ({ json: value }),
    deserialize: (value: { json: unknown }): unknown => value.json,
  },
}));

jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: jest.fn().mockResolvedValue('de'),
}));

import { shiftsRouter } from '@/features/schedule/api/shifts-router';
import { getPayload, NotFound } from 'payload';

const createCaller = createCallerFactory(shiftsRouter);

describe('shiftsRouter.getShiftStatus', () => {
  const findByID = jest.fn();
  const findMany = jest.fn();

  const caller = (): ReturnType<typeof createCaller> =>
    createCaller({
      user: undefined,
      locale: 'de',
      prisma: { enrollment: { findMany } },
    } as unknown as Context);

  beforeEach(() => {
    jest.clearAllMocks();
    (getPayload as unknown as jest.Mock).mockResolvedValue({ findByID });
    findMany.mockResolvedValue([]);
  });

  it('returns the status for an existing shift', async () => {
    findByID.mockResolvedValue({
      participants_max: 4,
      enable_enrolment: true,
      hide_participant_list: true,
    });

    const result = await caller().getShiftStatus({ shiftId: 'shift-1' });

    expect(result).toMatchObject({ enrolledCount: 0, maxParticipants: 4, isEnrolled: false });
    expect(findMany).toHaveBeenCalledWith({
      where: { courseId: 'shift-1', courseType: CourseType.SHIFT },
      include: { user: true },
    });
  });

  it('reports a deleted shift as null', async () => {
    findByID.mockRejectedValue(Object.create(NotFound.prototype) as Error);

    await expect(caller().getShiftStatus({ shiftId: 'gone' })).resolves.toBeNull();
  });

  /**
   * #1537: any other failure used to be swallowed into `null` as well. `null` is a *successful*
   * response, so React Query cached it, the persister wrote it to IndexedDB, and — with the
   * client's `refetchOnMount: false` — that one shift rendered "Offline – Anmeldung nicht möglich"
   * on an otherwise perfectly online device until the entry aged out. It has to fail loudly so the
   * client retries instead of trusting an empty answer.
   */
  it('surfaces a transient database failure as an error rather than an empty result', async () => {
    findByID.mockRejectedValue(new Error('connection pool timeout'));

    await expect(caller().getShiftStatus({ shiftId: 'shift-1' })).rejects.toBeInstanceOf(TRPCError);
  });
});
