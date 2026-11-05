import { CourseType } from '@/lib/prisma';
import type { Context } from '@/trpc/init';
import { createCallerFactory } from '@/trpc/init';

jest.mock('@payload-config', () => ({}), { virtual: true });

jest.mock('payload', () => ({
  getPayload: jest.fn(),
  NotFound: class NotFound extends Error {},
}));

jest.mock('@/lib/prisma', () => ({
  CourseType: { SHIFT: 'SHIFT', PROGRAM: 'PROGRAM' },
  ChatMembershipPermission: { ADMIN: 'ADMIN', GUEST: 'GUEST' },
  ChatType: {},
  MessageEventType: {},
  MessageType: {},
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

jest.mock('@/features/chat/api/database-interactions/create-new-chat', () => ({
  createNewChat: jest.fn(),
}));

jest.mock('@/features/chat/api/utils/system-message-helpers', () => ({
  getJoinGroupMessagePayload: jest.fn(),
  getLeftGroupMessagePayload: jest.fn(),
}));

jest.mock('@/features/schedule/api/organiser-entries', () => ({
  ensureOrganiserStars: jest.fn(),
}));

jest.mock('@/lib/db/publish-membership-revoked', () => ({
  publishMembershipRevoked: jest.fn(),
}));

jest.mock('@/utils/markdown-to-lexical', () => ({
  convertLexicalToMarkdown: jest.fn(),
  convertMarkdownToLexical: jest.fn(),
}));

jest.mock('@/utils/server-logger', () => ({
  createLogger: (): unknown => ({ debug: jest.fn(), info: jest.fn(), error: jest.fn() }),
}));

import { scheduleRouter } from '@/features/schedule/api/schedule-router';
import { getPayload } from 'payload';

const createCaller = createCallerFactory(scheduleRouter);

const morningShift = {
  title: 'Abwasch',
  timeslot: { date: '2027-07-24T00:00:00.000Z', time: '08:00 - 12:00' },
  unenrollment_deadline_minutes: 30,
};

const morningWorkshop = {
  title: 'Seilbrücke',
  enable_enrolment: true,
  timeslot: { date: '2027-07-24T00:00:00.000Z', time: '09:00 - 10:00' },
};

/** The two arguments that decide how many documents `payload.find` returns. */
interface PaginationArguments {
  pagination?: boolean;
  limit?: number;
}

/**
 * A shift enrolment is one row among the workshop enrolments, and the workshop mutations used to
 * reach it: handing them the id of a shift took a helper out of it after the withdrawal deadline,
 * which `shifts.unenrollFromShift` refuses. The deadline has to hold on every way out.
 */
describe('scheduleRouter and the shift withdrawal deadline', () => {
  const findByID = jest.fn();
  const find = jest.fn();
  const enrollment = {
    deleteMany: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  };

  const prisma: Record<string, unknown> = {
    user: { upsert: jest.fn().mockResolvedValue({}) },
    enrollment,
    chat: { findFirst: jest.fn() },
    $executeRaw: jest.fn(),
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
    (getPayload as unknown as jest.Mock).mockResolvedValue({ findByID, find });
    findByID.mockImplementation(({ collection }: { collection: string }) =>
      Promise.resolve(collection === 'helper-shifts' ? morningShift : morningWorkshop),
    );
    find.mockResolvedValue({ docs: [] });
    enrollment.findFirst.mockResolvedValue({ courseType: CourseType.SHIFT });
    enrollment.findMany.mockResolvedValue([]);
    enrollment.count.mockResolvedValue(0);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('removes only a workshop enrolment through unenrollFromCourse', async () => {
    await caller().unenrollFromCourse({ courseId: 'shift-1' });

    expect(enrollment.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'helper-1', courseId: 'shift-1', courseType: CourseType.PROGRAM },
    });
  });

  it('refuses to switch out of a shift into a workshop once the deadline has passed', async () => {
    jest.setSystemTime(new Date('2027-07-24T05:55:00.000Z')); // 07:55 in Zurich

    await expect(
      caller().switchEnrollment({
        fromCourseId: 'shift-1',
        toCourseId: 'workshop-1',
        fromCourseType: 'shift',
      }),
    ).rejects.toMatchObject({ reason: 'unenrollmentDeadlinePassed' });
    expect(enrollment.delete).not.toHaveBeenCalled();
    expect(enrollment.create).not.toHaveBeenCalled();
  });

  it('switches out of a shift into a workshop while the window is still open', async () => {
    jest.setSystemTime(new Date('2027-07-24T05:29:00.000Z')); // 07:29 in Zurich

    await expect(
      caller().switchEnrollment({
        fromCourseId: 'shift-1',
        toCourseId: 'workshop-1',
        fromCourseType: 'shift',
      }),
    ).resolves.toMatchObject({ success: true });
    expect(enrollment.delete).toHaveBeenCalledTimes(1);
  });

  /**
   * Payload hands back ten documents unless a query opts out of pagination, so a clash with the
   * eleventh enrolment went unseen and the helper was booked twice for the same hour.
   */
  it('sees a time conflict with the eleventh shift a helper is enrolled in', async () => {
    const shiftIds = Array.from({ length: 11 }, (_, index) => `shift-${index + 1}`);
    enrollment.findMany.mockImplementation(({ where }: { where: { courseType: CourseType } }) =>
      Promise.resolve(
        where.courseType === CourseType.SHIFT ? shiftIds.map((courseId) => ({ courseId })) : [],
      ),
    );
    find.mockImplementation(
      ({ where, pagination, limit }: { where: { id: { in: string[] } } } & PaginationArguments) => {
        const shifts = where.id.in.map((id) => ({
          id,
          title: 'Abwasch',
          timeslot: {
            date: morningWorkshop.timeslot.date,
            time: id === 'shift-11' ? '09:30 - 11:00' : '14:00 - 15:00',
          },
        }));
        const pageSize = limit ?? (pagination === false ? 0 : 10);
        return Promise.resolve({ docs: pageSize === 0 ? shifts : shifts.slice(0, pageSize) });
      },
    );

    await expect(caller().enrollInCourse({ courseId: 'workshop-1' })).rejects.toMatchObject({
      reason: 'timeConflict',
      params: { kind: 'shift', title: 'Abwasch', id: 'shift-11' },
      // what the previous release parses, so a stale shell still opens its switch dialog
      message: 'Time conflict with shift: Abwasch|shift-11',
    });
    expect(enrollment.create).not.toHaveBeenCalled();
  });
});

/**
 * The programme asks for these after every enrolment, for every block at once. They count in
 * the database instead of loading each enrolment with its user, and that must not change what
 * a participant, an organiser or a guest sees.
 */
describe('scheduleRouter course statuses', () => {
  const findByID = jest.fn();
  const find = jest.fn();
  const enrollment = {
    groupBy: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
  };
  const prisma = {
    enrollment,
    chat: { findFirst: jest.fn(), findMany: jest.fn() },
  };

  const callerAs = (user?: { uuid: string; name: string }): ReturnType<typeof createCaller> =>
    createCaller({ user, locale: 'de', prisma } as unknown as Context);

  beforeEach(() => {
    jest.clearAllMocks();
    (getPayload as unknown as jest.Mock).mockResolvedValue({ findByID, find });
    // Prisma answers a miss with null
    prisma.chat.findFirst.mockResolvedValue(null);
    prisma.chat.findMany.mockResolvedValue([]);
  });

  describe('getCourseStatuses', () => {
    beforeEach(() => {
      find.mockResolvedValue({
        docs: [
          { id: 'seilbruecke', participants_max: 12, enable_enrolment: true, organiser: [] },
          {
            id: 'theater',
            // Payload stores an emptied number field as null: no limit
            participants_max: null,
            enable_enrolment: true,
            organiser: ['leiter-1'],
          },
        ],
      });
      enrollment.groupBy.mockResolvedValue([{ courseId: 'seilbruecke', _count: { _all: 7 } }]);
      enrollment.findMany.mockResolvedValue([{ courseId: 'seilbruecke' }]);
    });

    it('reports the count, the own enrolment and the organiser per block', async () => {
      const result = await callerAs({ uuid: 'leiter-1', name: 'Lea' }).getCourseStatuses({
        courseIds: ['seilbruecke', 'theater', 'deleted-block'],
      });

      // a block deleted in the CMS since the client cached its id is left out
      expect(Object.keys(result)).toEqual(['seilbruecke', 'theater']);
      expect(result['seilbruecke']).toEqual(
        expect.objectContaining({
          enrolledCount: 7,
          maxParticipants: 12,
          isEnrolled: true,
          isOrganiser: false,
        }),
      );
      expect(result['theater']).toEqual(
        expect.objectContaining({
          enrolledCount: 0,
          maxParticipants: undefined,
          isEnrolled: false,
          isOrganiser: true,
        }),
      );
    });

    it('keeps the counts off the User table and away from shift enrolments', async () => {
      await callerAs({ uuid: 'leiter-1', name: 'Lea' }).getCourseStatuses({
        courseIds: ['seilbruecke'],
      });

      expect(enrollment.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { courseId: { in: ['seilbruecke'] }, courseType: CourseType.PROGRAM },
        }),
      );
      for (const [query] of enrollment.findMany.mock.calls as [Record<string, unknown>][]) {
        expect(query).not.toHaveProperty('include');
      }
    });

    it('tells a guest they are enrolled nowhere without asking for their enrolments', async () => {
      const result = await callerAs().getCourseStatuses({ courseIds: ['seilbruecke'] });

      expect(result['seilbruecke']).toEqual(
        expect.objectContaining({ enrolledCount: 7, isEnrolled: false }),
      );
      expect(enrollment.findMany).not.toHaveBeenCalled();
    });

    it('refuses more ids than one request may carry', async () => {
      const courseIds = Array.from({ length: 101 }, (_, index) => `block-${index}`);

      await expect(callerAs().getCourseStatuses({ courseIds })).rejects.toThrow();
      expect(find).not.toHaveBeenCalled();
    });
  });

  describe('getCourseStatus', () => {
    const course = {
      id: 'theater',
      participants_max: 20,
      enable_enrolment: true,
      hide_participant_list: false,
      organiser: ['leiter-1'],
    };

    beforeEach(() => {
      findByID.mockResolvedValue(course);
      enrollment.count.mockResolvedValue(2);
      enrollment.findFirst.mockResolvedValue(null);
      enrollment.findMany.mockResolvedValue([
        { user: { uuid: 'tn-1', name: 'Mia' } },
        { user: { uuid: 'tn-2', name: 'Noah' } },
      ]);
    });

    it('gives the organiser the count and the roster', async () => {
      const status = await callerAs({ uuid: 'leiter-1', name: 'Lea' }).getCourseStatus({
        courseId: 'theater',
      });

      expect(status).toEqual(
        expect.objectContaining({
          enrolledCount: 2,
          isEnrolled: false,
          participants: [
            { uuid: 'tn-1', name: 'Mia' },
            { uuid: 'tn-2', name: 'Noah' },
          ],
        }),
      );
    });

    it('gives the organiser a count that matches the names, even under a concurrent enrolment', async () => {
      // a count taken separately would already see a third enrolment the roster does not
      enrollment.count.mockResolvedValue(3);

      const status = await callerAs({ uuid: 'leiter-1', name: 'Lea' }).getCourseStatus({
        courseId: 'theater',
      });

      expect(status?.enrolledCount).toBe(status?.participants.length);
    });

    it('tells an organiser enrolled in their own block that they are enrolled', async () => {
      enrollment.findMany.mockResolvedValue([{ user: { uuid: 'leiter-1', name: 'Lea' } }]);

      const status = await callerAs({ uuid: 'leiter-1', name: 'Lea' }).getCourseStatus({
        courseId: 'theater',
      });

      expect(status).toEqual(expect.objectContaining({ enrolledCount: 1, isEnrolled: true }));
    });

    it('gives a participant the count and their own enrolment, but no names', async () => {
      enrollment.findFirst.mockResolvedValue({ id: 'enrolment-1' });

      const status = await callerAs({ uuid: 'tn-1', name: 'Mia' }).getCourseStatus({
        courseId: 'theater',
      });

      expect(status).toEqual(
        expect.objectContaining({ enrolledCount: 2, isEnrolled: true, participants: [] }),
      );
      expect(enrollment.findMany).not.toHaveBeenCalled();
    });

    it('withholds the roster from the organiser while the list is hidden', async () => {
      findByID.mockResolvedValue({ ...course, hide_participant_list: true });

      const status = await callerAs({ uuid: 'leiter-1', name: 'Lea' }).getCourseStatus({
        courseId: 'theater',
      });

      expect(status?.participants).toEqual([]);
      expect(enrollment.findMany).not.toHaveBeenCalled();
    });
  });
});

describe('scheduleRouter star.updateStars', () => {
  const star = {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  };
  const prisma = { user: { upsert: jest.fn().mockResolvedValue({}) }, star };

  const caller = (): ReturnType<typeof createCaller> =>
    createCaller({
      user: { uuid: 'leiter-1', name: 'Anna Muster' },
      locale: 'de',
      prisma,
    } as unknown as Context);

  beforeEach(() => {
    jest.clearAllMocks();
    star.findMany.mockResolvedValue([{ courseId: 'theater' }]);
  });

  it('stores the stars a device added and drops the ones it removed', async () => {
    const result = await caller().star.updateStars({
      changes: [
        { courseId: 'theater', starred: true },
        { courseId: 'seilbruecke', starred: false },
      ],
    });

    expect(star.createMany).toHaveBeenCalledWith({
      data: [{ courseId: 'theater', userId: 'leiter-1', courseType: CourseType.PROGRAM }],
      skipDuplicates: true,
    });
    expect(star.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'leiter-1', courseId: { in: ['seilbruecke'] } },
    });
    expect(result).toEqual(['theater']);
  });

  it('answers a device without changes with every star of the user', async () => {
    const result = await caller().star.updateStars({ changes: [] });

    expect(star.createMany).not.toHaveBeenCalled();
    expect(star.deleteMany).not.toHaveBeenCalled();
    expect(result).toEqual(['theater']);
  });

  // The device replaces its confirmed stars with the answer, so a made-up one would lose stars.
  it('fails instead of answering when the database does', async () => {
    star.findMany.mockRejectedValue(new Error('connection lost'));

    await expect(caller().star.updateStars({ changes: [] })).rejects.toThrow();
  });
});
