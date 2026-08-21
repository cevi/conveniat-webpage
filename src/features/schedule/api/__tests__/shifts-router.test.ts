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

const enrolment = (uuid: string, name: string): unknown => ({
  userId: uuid,
  user: { uuid, name },
});

describe('shiftsRouter.getShiftStatus', () => {
  const findByID = jest.fn();
  const findMany = jest.fn();

  const caller = (user?: { uuid: string }): ReturnType<typeof createCaller> =>
    createCaller({
      user,
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

  /**
   * The roster belongs to the organisers of the shift and nobody else. It is withheld on the
   * server rather than in the card, because a client-side guard would still ship the helper
   * names in the tRPC response for any enrolled user to read straight out of the payload.
   */
  describe('the enrolled helpers', () => {
    beforeEach(() => {
      findMany.mockResolvedValue([enrolment('helper-1', 'Anna Muster')]);
    });

    it('are listed for an organiser of the shift', async () => {
      findByID.mockResolvedValue({ enable_enrolment: true, organiser: ['org-1'] });

      const result = await caller({ uuid: 'org-1' }).getShiftStatus({ shiftId: 'shift-1' });

      expect(result).toMatchObject({
        isAdmin: true,
        participants: [{ uuid: 'helper-1', name: 'Anna Muster' }],
      });
    });

    it('are withheld from an enrolled helper who does not organise the shift', async () => {
      findByID.mockResolvedValue({ enable_enrolment: true, organiser: ['org-1'] });

      const result = await caller({ uuid: 'helper-1' }).getShiftStatus({ shiftId: 'shift-1' });

      expect(result).toMatchObject({ isAdmin: false, isEnrolled: true, participants: [] });
      expect(result?.enrolledCount).toBe(1);
    });

    it('are withheld from an anonymous visitor', async () => {
      findByID.mockResolvedValue({ enable_enrolment: true, organiser: ['org-1'] });

      const result = await caller().getShiftStatus({ shiftId: 'shift-1' });

      expect(result).toMatchObject({ isAdmin: false, participants: [] });
    });

    /**
     * "Teilnehmerliste ausblenden" takes the roster out of the app entirely - for the organiser
     * too. With it on the list stays exclusive to the admin panel, whose export never consults
     * the flag.
     */
    it('are withheld from the organiser once the list is hidden', async () => {
      findByID.mockResolvedValue({
        enable_enrolment: true,
        organiser: ['org-1'],
        hide_participant_list: true,
      });

      const result = await caller({ uuid: 'org-1' }).getShiftStatus({ shiftId: 'shift-1' });

      expect(result).toMatchObject({ isAdmin: true, participants: [] });
    });

    /**
     * Payload only materialises a checkbox on documents saved since it was added, so shifts
     * predating it carry `undefined`. That has to read as its `false` default - "not hidden" -
     * rather than withhold the roster from every shift older than the field.
     */
    it('are listed for the organiser of a shift saved before the hide flag existed', async () => {
      findByID.mockResolvedValue({ enable_enrolment: true, organiser: ['org-1'] });

      const result = await caller({ uuid: 'org-1' }).getShiftStatus({ shiftId: 'shift-1' });

      expect(result?.participants).toHaveLength(1);
    });

    /**
     * `getShiftStatus` reads the shift at `depth: 0`, so the relationship arrives as plain ID
     * strings. A populated document is still handled, because a future caller raising the depth
     * must not silently turn every organiser into a non-organiser.
     */
    it('recognise an organiser whether the relationship is populated or not', async () => {
      findByID.mockResolvedValue({
        enable_enrolment: true,
        organiser: [{ id: 'org-1', fullName: 'Otto Organisator' }],
      });

      const result = await caller({ uuid: 'org-1' }).getShiftStatus({ shiftId: 'shift-1' });

      expect(result).toMatchObject({ isAdmin: true });
    });

    it('leave a shift without organisers with nobody who can see the roster', async () => {
      findByID.mockResolvedValue({ enable_enrolment: true });

      const result = await caller({ uuid: 'helper-1' }).getShiftStatus({ shiftId: 'shift-1' });

      expect(result).toMatchObject({ isAdmin: false, participants: [] });
    });
  });
});
