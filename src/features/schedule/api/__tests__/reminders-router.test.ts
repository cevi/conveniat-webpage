import type { Context } from '@/trpc/init';
import { createCallerFactory } from '@/trpc/init';

jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({ getPayload: jest.fn() }));
jest.mock('@/lib/prisma', () => ({ CourseType: { PROGRAM: 'PROGRAM', SHIFT: 'SHIFT' } }));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { APP_HOST_URL: 'https://app.test' },
}));
jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: jest.fn().mockResolvedValue('de'),
}));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): unknown => ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn() }),
}));
jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown): { json: unknown } => ({ json: value }),
    deserialize: (value: { json: unknown }): unknown => value.json,
  },
}));

import { remindersRouter } from '@/features/schedule/api/reminders-router';
import { getPayload } from 'payload';

const createCaller = createCallerFactory(remindersRouter);

const prisma = {
  user: { upsert: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
  scheduleReminder: { findMany: jest.fn(), upsert: jest.fn() },
  enrollment: { findMany: jest.fn(), findFirst: jest.fn() },
  star: { createMany: jest.fn() },
  $transaction: async (run: (transaction: unknown) => Promise<unknown>): Promise<unknown> =>
    await run(prisma),
};
const count = jest.fn();

const callerAs = (uuid?: string, locale = 'de'): ReturnType<typeof createCaller> =>
  createCaller({
    user: uuid === undefined ? undefined : { uuid, name: 'Anna Muster' },
    locale,
    prisma,
  } as unknown as Context);

describe('remindersRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPayload as jest.Mock).mockResolvedValue({ count });
    count.mockResolvedValue({ totalDocs: 1 });
    prisma.scheduleReminder.findMany.mockResolvedValue([]);
    prisma.enrollment.findMany.mockResolvedValue([]);
    // eslint-disable-next-line unicorn/no-null -- Prisma's "not found"
    prisma.enrollment.findFirst.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue({ reminderLeadMinutes: 15, reminderAtStart: true });
  });

  it('refuses every procedure to a visitor who is not logged in', async () => {
    const guest = callerAs();
    await expect(guest.getReminders()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(guest.getReminderSettings()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(
      guest.setReminder({ entryId: 'slot-q5', entryKind: 'program', enabled: true }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(
      guest.updateReminderSettings({ leadMinutes: 5, atStart: true }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(prisma.scheduleReminder.upsert).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('reads only the calling user’s reminders and enrolments', async () => {
    await callerAs('anna').getReminders();

    expect(prisma.scheduleReminder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'anna' } }),
    );
    expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'anna' } }),
    );
  });

  it('lists enrolments as automatic reminders, and an opt-out as off', async () => {
    prisma.enrollment.findMany.mockResolvedValue([
      { courseId: 'slot-q5', courseType: 'PROGRAM' },
      { courseId: 'shift-1', courseType: 'SHIFT' },
    ]);
    prisma.scheduleReminder.findMany.mockResolvedValue([
      { entryId: 'shift-1', entryType: 'SHIFT', enabled: false },
      { entryId: 'slot-q7', entryType: 'PROGRAM', enabled: true },
    ]);

    await expect(callerAs('anna').getReminders()).resolves.toEqual([
      { entryId: 'slot-q5', entryKind: 'program', isOn: true, isAutomatic: true },
      { entryId: 'shift-1', entryKind: 'shift', isOn: false, isAutomatic: true },
      { entryId: 'slot-q7', entryKind: 'program', isOn: true, isAutomatic: false },
    ]);
  });

  it('stars a block when its reminder is set, for the calling user only', async () => {
    await callerAs('anna', 'fr').setReminder({
      entryId: 'slot-q5',
      entryKind: 'program',
      enabled: true,
    });

    expect(prisma.scheduleReminder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_entryId: { userId: 'anna', entryId: 'slot-q5' } },
      }),
    );
    expect(prisma.star.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'anna', courseId: 'slot-q5', courseType: 'PROGRAM' }],
      skipDuplicates: true,
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { uuid: 'anna' },
      data: { reminderLocale: 'fr' },
    });
  });

  it('leaves the star alone when a reminder is switched off, and stars no shift', async () => {
    await callerAs('anna').setReminder({
      entryId: 'slot-q5',
      entryKind: 'program',
      enabled: false,
    });
    await callerAs('anna').setReminder({ entryId: 'shift-1', entryKind: 'shift', enabled: true });

    expect(prisma.star.createMany).not.toHaveBeenCalled();
  });

  it('refuses a lead time Einstellungen does not offer', async () => {
    await expect(
      callerAs('anna').updateReminderSettings({ leadMinutes: 7, atStart: true }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('stores the timing on the calling user', async () => {
    await callerAs('anna').updateReminderSettings({ leadMinutes: 0, atStart: false });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { uuid: 'anna' },
        data: { reminderLeadMinutes: 0, reminderAtStart: false, reminderLocale: 'de' },
      }),
    );
  });

  it('gives a user without a stored timing the defaults, and says whether a device gets pushes', async () => {
    // eslint-disable-next-line unicorn/no-null -- Prisma's "not found"
    prisma.user.findUnique.mockResolvedValue(null);
    count.mockResolvedValue({ totalDocs: 0 });

    await expect(callerAs('anna').getReminderSettings()).resolves.toEqual({
      leadMinutes: 15,
      atStart: true,
      hasPushDevice: false,
    });
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user: { equals: 'anna' } } }),
    );
  });
});
