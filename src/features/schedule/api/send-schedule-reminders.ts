import { environmentVariables } from '@/config/environment-variables';
import { enabledLocales } from '@/features/payload-cms/payload-cms/locales';
import { reminderLabels } from '@/features/schedule/constants/reminder-labels';
import type {
  DueReminder,
  RemindableEntry,
  ReminderTiming,
} from '@/features/schedule/utils/reminder-timing';
import {
  mayBeDue,
  reminderTimingOf,
  resolveDueReminders,
  startOfEntry,
} from '@/features/schedule/utils/reminder-timing';
import { dayKeyOf } from '@/features/schedule/utils/time-utils';
import prisma from '@/lib/db/prisma';
import { CourseType, PushNotificationKind } from '@/lib/prisma';
import { enqueuePushNotification } from '@/lib/push/push-queue';
import type { Locale } from '@/types/types';
import { getAppShortName } from '@/utils/get-app-short-name';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { getPayload } from 'payload';

const logger = createLogger('schedule:reminders');

const DAY = 24 * 60 * 60 * 1000;

const COLLECTION_OF = {
  PROGRAM: 'camp-schedule-entry',
  SHIFT: 'helper-shifts',
} as const;

/** What one run did, for the job's output and the log. */
export interface ReminderRunSummary {
  candidates: number;
  due: number;
  /** pushes this run claimed and queued; a push another run already claimed is not counted */
  sent: number;
  failed: number;
}

/**
 * The entries whose start could make a reminder due now: every slot and shift on the days
 * around today, filtered on the camp's clock. Read through the local API, which leaves out
 * entries in the trash.
 */
const findCandidates = async (now: Date): Promise<RemindableEntry[]> => {
  const payload = await getPayload({ config });
  // a date is stored at noon UTC of its day, so two days either side covers the camp's today
  const where = {
    'timeslot.date': {
      greater_than_equal: new Date(now.getTime() - 2 * DAY).toISOString(),
      less_than_equal: new Date(now.getTime() + 2 * DAY).toISOString(),
    },
  };

  const candidates: RemindableEntry[] = [];
  for (const type of ['PROGRAM', 'SHIFT'] as const) {
    const { docs } = await payload.find({
      collection: COLLECTION_OF[type],
      where,
      depth: 0,
      pagination: false,
      select: { timeslot: true },
    });
    for (const { id, timeslot } of docs) {
      const start = startOfEntry(timeslot);
      if (start !== undefined && mayBeDue(start, now)) candidates.push({ id, type, start });
    }
  }
  return candidates;
};

const localeOf = (stored: string | null | undefined): Locale =>
  enabledLocales.find((locale) => locale === stored) ?? 'de';

/** The title and place of the entries a push is about, in one language. */
const describeEntries = async (
  entries: readonly RemindableEntry[],
  locale: Locale,
): Promise<Map<string, { title: string; place: string | undefined }>> => {
  const payload = await getPayload({ config });
  const described = new Map<string, { title: string; place: string | undefined }>();

  for (const type of ['PROGRAM', 'SHIFT'] as const) {
    const ids = entries.filter((entry) => entry.type === type).map(({ id }) => id);
    if (ids.length === 0) continue;
    const { docs } = await payload.find({
      collection: COLLECTION_OF[type],
      where: { id: { in: ids } },
      locale,
      fallbackLocale: 'de',
      depth: 1,
      pagination: false,
      select: { title: true, location: true, ...(type === 'SHIFT' && { meetingPoint: true }) },
      populate: { 'camp-map-annotations': { title: true } },
    });
    for (const document_ of docs) {
      const location =
        typeof document_.location === 'object' && document_.location !== null
          ? document_.location.title
          : undefined;
      const meetingPoint =
        'meetingPoint' in document_ && typeof document_.meetingPoint === 'string'
          ? document_.meetingPoint
          : undefined;
      // where a helper meets says more than the area the shift is in
      const place = [meetingPoint, location].find(
        (candidate) => candidate !== undefined && candidate !== '',
      );
      described.set(document_.id, { title: document_.title, place });
    }
  }
  return described;
};

/** The page a reminder opens: the block on its day in Programm, or the shift. */
const urlOf = (entry: RemindableEntry): string =>
  entry.type === 'PROGRAM'
    ? `${environmentVariables.APP_HOST_URL}/app/schedule?date=${dayKeyOf(entry.start)}&id=${entry.id}`
    : `${environmentVariables.APP_HOST_URL}/app/helper-portal?id=${entry.id}`;

/** "Ballspiele beginnt in 15 min · Spielwiese Mitte" */
export const reminderText = (
  reminder: Pick<DueReminder, 'kind' | 'leadMinutes'>,
  entry: { title: string; place: string | undefined },
  locale: Locale,
): string => {
  const what = (reminder.kind === 'LEAD' ? reminderLabels.pushLead : reminderLabels.pushStart)[
    locale
  ]
    .replace('{{title}}', entry.title)
    .replace('{{minutes}}', String(reminder.leadMinutes));
  return entry.place === undefined ? what : `${what} · ${entry.place}`;
};

/**
 * Claims the given pushes in the delivery log. Returns the ones this call claimed: a push that
 * another replica, or an earlier run, already claimed for the same start is left out, so it
 * goes out once however many runs see it.
 */
const claim = async (due: readonly DueReminder[]): Promise<DueReminder[]> => {
  if (due.length === 0) return [];
  const claimed = await prisma.scheduleReminderDelivery.createManyAndReturn({
    data: due.map(({ userId, entryId, kind, scheduledFor }) => ({
      userId,
      entryId,
      kind,
      scheduledFor,
    })),
    skipDuplicates: true,
    select: { userId: true, entryId: true, kind: true, scheduledFor: true },
  });
  const keyOf = (row: Pick<DueReminder, 'userId' | 'entryId' | 'kind' | 'scheduledFor'>): string =>
    `${row.userId}|${row.entryId}|${row.kind}|${row.scheduledFor.getTime()}`;
  const claimedKeys = new Set(claimed.map((row) => keyOf(row)));
  return due.filter((reminder) => claimedKeys.has(keyOf(reminder)));
};

/** Gives back a claim whose push could not be queued, so the next run tries it again. */
const release = async (reminders: readonly DueReminder[]): Promise<void> => {
  await prisma.scheduleReminderDelivery.deleteMany({
    where: {
      OR: reminders.map(({ userId, entryId, kind, scheduledFor }) => ({
        userId,
        entryId,
        kind,
        scheduledFor,
      })),
    },
  });
};

/**
 * Sends the reminder pushes that are due: a while before a block or shift starts, and when it
 * starts, to everybody who set a reminder for it or is enrolled in it and did not switch the
 * reminder off, each with their own timing and in their own language.
 *
 * Runs once a minute on whichever replica the job queue hands it to, and possibly on two at
 * once. Every push is claimed in `ScheduleReminderDelivery` before it is queued, so it goes out
 * once.
 *
 * @param now - The moment to send for; the job passes the time it runs.
 */
export const sendScheduleReminders = async (
  now: Date = new Date(),
): Promise<ReminderRunSummary> => {
  const summary: ReminderRunSummary = { candidates: 0, due: 0, sent: 0, failed: 0 };

  const candidates = await findCandidates(now);
  summary.candidates = candidates.length;
  if (candidates.length === 0) return summary;

  const entryIds = candidates.map(({ id }) => id);
  const [reminders, enrollments] = await Promise.all([
    prisma.scheduleReminder.findMany({
      where: { entryId: { in: entryIds } },
      select: { userId: true, entryId: true, enabled: true },
    }),
    prisma.enrollment.findMany({
      where: {
        courseId: { in: entryIds },
        courseType: { in: [CourseType.PROGRAM, CourseType.SHIFT] },
      },
      select: { userId: true, courseId: true, courseType: true },
    }),
  ]);

  const userIds = [...new Set([...reminders, ...enrollments].map(({ userId }) => userId))];
  const users = await prisma.user.findMany({
    where: { uuid: { in: userIds } },
    select: { uuid: true, reminderLeadMinutes: true, reminderAtStart: true, reminderLocale: true },
  });
  const timings = new Map<string, ReminderTiming>(
    users.map((user) => [user.uuid, reminderTimingOf(user)]),
  );
  const localeOfUser = new Map(users.map((user) => [user.uuid, localeOf(user.reminderLocale)]));

  const due = resolveDueReminders({ entries: candidates, reminders, enrollments, timings, now });
  summary.due = due.length;

  const claimed = await claim(due);
  if (claimed.length === 0) {
    logger.debug('Reminder run', { ...summary });
    return summary;
  }

  // one push per entry, kind, lead time and language: everybody in it reads the same text
  const groups = new Map<string, { locale: Locale; reminders: DueReminder[] }>();
  for (const reminder of claimed) {
    const locale = localeOfUser.get(reminder.userId) ?? 'de';
    const key = `${reminder.entryId}|${reminder.kind}|${reminder.leadMinutes}|${locale}`;
    const group = groups.get(key) ?? { locale, reminders: [] };
    group.reminders.push(reminder);
    groups.set(key, group);
  }

  const entriesById = new Map(candidates.map((entry) => [entry.id, entry]));
  const descriptions = new Map<Locale, Awaited<ReturnType<typeof describeEntries>>>();
  const appName = await getAppShortName();

  for (const { locale, reminders: group } of groups.values()) {
    const [first] = group;
    const entry = first === undefined ? undefined : entriesById.get(first.entryId);
    if (first === undefined || entry === undefined) continue;
    try {
      if (!descriptions.has(locale)) {
        const remindedEntries = [...new Set(claimed.map(({ entryId }) => entryId))].flatMap(
          (id) => entriesById.get(id) ?? [],
        );
        descriptions.set(locale, await describeEntries(remindedEntries, locale));
      }
      const description = descriptions.get(locale)?.get(entry.id);
      // gone between the two reads, e.g. moved to the trash: nothing left to remind of
      if (description === undefined) {
        summary.failed += group.length;
        continue;
      }

      const text = reminderText(first, description, locale);
      await enqueuePushNotification({
        kind: PushNotificationKind.REMINDER,
        recipientUserIds: group.map(({ userId }) => userId),
        title: appName,
        body: text,
        url: urlOf(entry),
      });
      summary.sent += group.length;
    } catch (error: unknown) {
      summary.failed += group.length;
      logger.error('Queuing a reminder push failed; the next run tries again', {
        error,
        'schedule.entry.id': entry.id,
        'schedule.entry.type': entry.type,
        'reminder.kind': first.kind,
        'reminder.recipients': group.length,
      });
      await release(group).catch((releaseError: unknown) => {
        logger.error('Could not release the claim of a reminder push that failed', {
          error: releaseError,
          'schedule.entry.id': entry.id,
          'reminder.kind': first.kind,
        });
      });
    }
  }

  logger.debug('Reminder run', { ...summary });
  return summary;
};

/**
 * Forgets the pushes sent more than two days ago. A claim only has to outlive the few minutes
 * its push stays due; the rest is a log nobody reads.
 */
export const pruneReminderDeliveries = async (now: Date = new Date()): Promise<number> => {
  const { count } = await prisma.scheduleReminderDelivery.deleteMany({
    where: { sentAt: { lt: new Date(now.getTime() - 2 * DAY) } },
  });
  return count;
};
