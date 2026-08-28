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

  /**
   * The client needs the instant, not a verdict: the status is cached for five minutes and
   * persisted across restarts, so a "you may still leave" boolean computed here would outlive the
   * window it describes.
   */
  describe('the withdrawal deadline', () => {
    it('is reported as an absolute instant in the camp timezone', async () => {
      findByID.mockResolvedValue({
        enable_enrolment: true,
        timeslot: { date: '2027-07-24T00:00:00.000Z', time: '08:00 - 12:00' },
        unenrollment_deadline_minutes: 30,
      });

      const result = await caller().getShiftStatus({ shiftId: 'shift-1' });

      // 08:00 in Zurich is 06:00 UTC in July, so the window shuts at 05:30 UTC
      expect(result?.unenrollmentDeadline).toBe('2027-07-24T05:30:00.000Z');
    });

    it('is absent, rather than fatal, for a shift whose timeslot cannot be read', async () => {
      findByID.mockResolvedValue({ enable_enrolment: true, timeslot: { time: 'ganztags' } });

      const result = await caller().getShiftStatus({ shiftId: 'shift-1' });

      expect(result?.unenrollmentDeadline).toBeUndefined();
    });
  });
});

const morningShift = (unenrollmentDeadlineMinutes?: number): unknown => ({
  enable_enrolment: true,
  timeslot: { date: '2027-07-24T00:00:00.000Z', time: '08:00 - 12:00' },
  unenrollment_deadline_minutes: unenrollmentDeadlineMinutes,
});

/** `instant` is UTC; the camp reads it two hours later in July */
const withClockAt = (instant: string): void => {
  jest.setSystemTime(new Date(instant));
};

/**
 * Helpers used to be able to drop out of a shift right up to the moment it started, which left
 * organisers standing at the meeting point one helper short with no time to react. The window
 * shuts `unenrollment_deadline_minutes` before the start - 30 by default - and it has to shut
 * here, on the server: the client's button is a courtesy, a queued offline mutation is not.
 */
describe('shiftsRouter.unenrollFromShift', () => {
  const findByID = jest.fn();
  const deleteMany = jest.fn();
  const upsert = jest.fn();

  const prisma: Record<string, unknown> = {
    user: { upsert },
    enrollment: { deleteMany },
    $transaction: async (run: (tx: unknown) => Promise<unknown>): Promise<unknown> =>
      await run(prisma),
  };

  const caller = (): ReturnType<typeof createCaller> =>
    createCaller({
      user: { uuid: 'helper-1', name: 'Anna Muster' },
      locale: 'de',
      prisma,
    } as unknown as Context);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (getPayload as unknown as jest.Mock).mockResolvedValue({ findByID });
    deleteMany.mockResolvedValue({ count: 1 });
    upsert.mockResolvedValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lets a helper out while the window is still open', async () => {
    findByID.mockResolvedValue(morningShift(30));
    withClockAt('2027-07-24T05:29:00.000Z'); // 07:29 in Zurich, a minute before the deadline

    await expect(caller().unenrollFromShift({ shiftId: 'shift-1' })).resolves.toEqual({
      success: true,
    });
    expect(deleteMany).toHaveBeenCalledTimes(1);
  });

  it('refuses a withdrawal once the deadline has passed', async () => {
    findByID.mockResolvedValue(morningShift(30));
    withClockAt('2027-07-24T05:55:00.000Z'); // 07:55 in Zurich, five minutes before the start

    await expect(caller().unenrollFromShift({ shiftId: 'shift-1' })).rejects.toBeInstanceOf(
      TRPCError,
    );
    expect(deleteMany).not.toHaveBeenCalled();
  });

  /**
   * Payload only materialises a field on documents saved since it was added, so every shift
   * planned before this feature carries no value at all. Those fall back to the default window
   * rather than staying open until the start.
   */
  it('applies the default window to a shift saved before the field existed', async () => {
    findByID.mockResolvedValue(morningShift());
    withClockAt('2027-07-24T05:40:00.000Z'); // 07:40 in Zurich, inside the default 30 minutes

    await expect(caller().unenrollFromShift({ shiftId: 'shift-1' })).rejects.toBeInstanceOf(
      TRPCError,
    );
  });

  it('keeps the window open all the way to the start when an admin sets it to zero', async () => {
    findByID.mockResolvedValue(morningShift(0));
    withClockAt('2027-07-24T05:59:00.000Z'); // 07:59 in Zurich, one minute before the start

    await expect(caller().unenrollFromShift({ shiftId: 'shift-1' })).resolves.toEqual({
      success: true,
    });
  });

  /**
   * The enrolment is dangling once the shift is gone, and deleting it is the only sensible
   * outcome - a missing shift must not leave the helper with a row they can never get rid of.
   */
  it('still removes the enrolment when the shift itself is gone', async () => {
    findByID.mockRejectedValue(Object.create(NotFound.prototype) as Error);
    withClockAt('2027-07-24T05:55:00.000Z');

    await expect(caller().unenrollFromShift({ shiftId: 'gone' })).resolves.toEqual({
      success: true,
    });
    expect(deleteMany).toHaveBeenCalledTimes(1);
  });
});
