jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({ getPayload: jest.fn() }));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { APP_HOST_URL: 'https://app.test' },
}));
jest.mock('@/features/payload-cms/payload-cms/locales', () => ({
  enabledLocales: ['de', 'fr', 'en'],
}));
jest.mock('@/lib/prisma', () => ({
  CourseType: { PROGRAM: 'PROGRAM', SHIFT: 'SHIFT' },
  PushNotificationKind: { REMINDER: 'REMINDER' },
}));
jest.mock('@/lib/push/push-queue', () => ({ enqueuePushNotification: jest.fn() }));
jest.mock('@/utils/get-app-short-name', () => ({
  getAppShortName: jest.fn().mockResolvedValue('conveniat27'),
}));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): unknown => ({ debug: jest.fn(), info: jest.fn(), error: jest.fn() }),
}));

interface Delivery {
  userId: string;
  entryId: string;
  kind: string;
  scheduledFor: Date;
}

/** The delivery log as Postgres keeps it: one row per user, entry, kind and due time. */
const deliveries: Delivery[] = [];
const keyOf = (row: Delivery): string =>
  `${row.userId}|${row.entryId}|${row.kind}|${row.scheduledFor.getTime()}`;

const mockDatabase = {
  scheduleReminder: { findMany: jest.fn() },
  enrollment: { findMany: jest.fn() },
  user: { findMany: jest.fn() },
  scheduleReminderDelivery: {
    createManyAndReturn: jest.fn(({ data }: { data: Delivery[] }) => {
      const inserted = data.filter((row) => !deliveries.some((old) => keyOf(old) === keyOf(row)));
      deliveries.push(...inserted);
      return Promise.resolve(inserted);
    }),
    deleteMany: jest.fn(({ where }: { where: { OR?: Delivery[] } }) => {
      const released = new Set((where.OR ?? []).map((row) => keyOf(row)));
      const before = deliveries.length;
      deliveries.splice(
        0,
        deliveries.length,
        ...deliveries.filter((row) => !released.has(keyOf(row))),
      );
      return Promise.resolve({ count: before - deliveries.length });
    }),
  },
};
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  get default(): typeof mockDatabase {
    return mockDatabase;
  },
}));

import { sendScheduleReminders } from '@/features/schedule/api/send-schedule-reminders';
import { enqueuePushNotification } from '@/lib/push/push-queue';
import { getPayload } from 'payload';

const enqueue = enqueuePushNotification as jest.Mock;

/** Ballspiele for Q5, Saturday 17:00 on the camp's clock */
let ballspiele = {
  id: 'slot-q5',
  title: 'Ballspiele',
  timeslot: { date: '2027-07-24T12:00:00.000Z', time: '17:00 - 17:30' },
  location: { id: 'place-1', title: 'Spielwiese Mitte' },
};
const titles: Record<string, string> = { de: 'Ballspiele', fr: 'Jeux de balle', en: 'Ball games' };

const find = jest.fn(({ collection, locale }: { collection: string; locale?: string }) =>
  Promise.resolve({
    docs:
      collection === 'camp-schedule-entry'
        ? [{ ...ballspiele, title: titles[locale ?? 'de'] ?? ballspiele.title }]
        : [],
  }),
);

describe('sendScheduleReminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deliveries.length = 0;
    ballspiele = { ...ballspiele, timeslot: { ...ballspiele.timeslot, time: '17:00 - 17:30' } };
    (getPayload as jest.Mock).mockResolvedValue({ find });
    enqueue.mockResolvedValue({ deliveries: 1 });
    mockDatabase.scheduleReminder.findMany.mockResolvedValue([
      { userId: 'anna', entryId: 'slot-q5', enabled: true },
    ]);
    mockDatabase.enrollment.findMany.mockResolvedValue([]);
    mockDatabase.user.findMany.mockResolvedValue([
      { uuid: 'anna', reminderLeadMinutes: 15, reminderAtStart: true, reminderLocale: 'de' },
    ]);
  });

  it('pushes the reminder 15 minutes before, and opens the block on its day', async () => {
    const summary = await sendScheduleReminders(new Date('2027-07-24T14:45:20.000Z'));

    expect(summary).toMatchObject({ due: 1, sent: 1, failed: 0 });
    expect(enqueue).toHaveBeenCalledWith({
      kind: 'REMINDER',
      recipientUserIds: ['anna'],
      title: 'conveniat27',
      body: 'Ballspiele beginnt in 15 min · Spielwiese Mitte',
      url: 'https://app.test/app/schedule?date=2027-07-24&id=slot-q5',
    });
  });

  it('sends nothing on a second run, or on a second replica, for the same start', async () => {
    await sendScheduleReminders(new Date('2027-07-24T14:45:20.000Z'));
    const again = await sendScheduleReminders(new Date('2027-07-24T14:46:20.000Z'));

    expect(again).toMatchObject({ due: 1, sent: 0 });
    expect(enqueue).toHaveBeenCalledTimes(1);
  });

  it('reminds again when the start was moved in the CMS', async () => {
    await sendScheduleReminders(new Date('2027-07-24T14:45:20.000Z'));
    ballspiele = { ...ballspiele, timeslot: { ...ballspiele.timeslot, time: '17:10 - 17:40' } };
    await sendScheduleReminders(new Date('2027-07-24T14:55:20.000Z'));

    expect(enqueue).toHaveBeenCalledTimes(2);
    expect(deliveries.map(({ scheduledFor }) => scheduledFor.toISOString())).toEqual([
      '2027-07-24T14:45:00.000Z',
      '2027-07-24T14:55:00.000Z',
    ]);
  });

  it('pushes at the start in the language the user chose', async () => {
    mockDatabase.user.findMany.mockResolvedValue([
      { uuid: 'anna', reminderLeadMinutes: 15, reminderAtStart: true, reminderLocale: 'fr' },
    ]);
    await sendScheduleReminders(new Date('2027-07-24T15:00:30.000Z'));

    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ body: 'Jeux de balle commence maintenant · Spielwiese Mitte' }),
    );
  });

  it('gives the claim back when queuing fails, so the next run sends it', async () => {
    enqueue.mockRejectedValueOnce(new Error('database gone'));
    const failed = await sendScheduleReminders(new Date('2027-07-24T14:45:20.000Z'));
    const retried = await sendScheduleReminders(new Date('2027-07-24T14:46:20.000Z'));

    expect(failed).toMatchObject({ sent: 0, failed: 1 });
    expect(retried).toMatchObject({ sent: 1 });
    expect(enqueue).toHaveBeenCalledTimes(2);
  });

  it('reminds an enrolled participant, but not one who switched it off', async () => {
    mockDatabase.scheduleReminder.findMany.mockResolvedValue([
      { userId: 'beat', entryId: 'slot-q5', enabled: false },
    ]);
    mockDatabase.enrollment.findMany.mockResolvedValue([
      { userId: 'beat', courseId: 'slot-q5', courseType: 'PROGRAM' },
      { userId: 'carla', courseId: 'slot-q5', courseType: 'PROGRAM' },
    ]);
    mockDatabase.user.findMany.mockResolvedValue([]);
    await sendScheduleReminders(new Date('2027-07-24T14:45:20.000Z'));

    // without a stored row, the defaults and German
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserIds: ['carla'],
        body: 'Ballspiele beginnt in 15 min · Spielwiese Mitte',
      }),
    );
  });

  it('sends nothing for a block that started more than five minutes ago', async () => {
    const summary = await sendScheduleReminders(new Date('2027-07-24T15:06:00.000Z'));

    expect(summary.candidates).toBe(0);
    expect(enqueue).not.toHaveBeenCalled();
  });
});
