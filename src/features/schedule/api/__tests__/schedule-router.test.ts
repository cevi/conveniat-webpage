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
import { UNENROLLMENT_DEADLINE_PASSED } from '@/features/schedule/utils/unenrollment-deadline';
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
    ).rejects.toThrow(UNENROLLMENT_DEADLINE_PASSED);
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
});
