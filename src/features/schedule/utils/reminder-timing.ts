import { slotOf } from '@/features/schedule/utils/programme-utils';
import { dayKeyOf } from '@/features/schedule/utils/time-utils';
import { campInstantOf } from '@/utils/camp-clock';

/** The choices for "Vorher" in Einstellungen; 0 is "Aus". */
export const REMINDER_LEAD_OPTIONS = [0, 5, 10, 15, 30] as const;

export type ReminderLeadMinutes = (typeof REMINDER_LEAD_OPTIONS)[number];

/** What a user who never opened the setting gets: a push 15 minutes before, and one at the start. */
export const DEFAULT_REMINDER_TIMING: ReminderTiming = { leadMinutes: 15, atStart: true };

/**
 * How late a reminder may still go out. A run of the job that was missed, or a replica that was
 * restarted, is caught up within it; anything older is left out, because "beginnt jetzt" five
 * minutes into the block is noise.
 */
export const REMINDER_GRACE_MINUTES = 5;

export type ReminderPushKind = 'LEAD' | 'START';

export interface ReminderTiming {
  /** minutes before the start; 0 is none */
  leadMinutes: number;
  atStart: boolean;
}

/** A reminder push that is due: what it is, and the moment it was due at. */
export interface DueReminderPush {
  kind: ReminderPushKind;
  scheduledFor: Date;
}

const MINUTE = 60_000;

/**
 * The timing stored for a user, read the way a stale or missing row has to be read: an unknown
 * lead time is taken as none rather than guessed.
 */
export const reminderTimingOf = (stored?: {
  reminderLeadMinutes: number | null;
  reminderAtStart: boolean;
}): ReminderTiming => {
  if (stored === undefined) return DEFAULT_REMINDER_TIMING;
  const lead = stored.reminderLeadMinutes ?? 0;
  return {
    leadMinutes: (REMINDER_LEAD_OPTIONS as readonly number[]).includes(lead) ? lead : 0,
    atStart: stored.reminderAtStart,
  };
};

/**
 * When an entry starts: its date and the start of its time slot on the camp's clock,
 * Europe/Zurich. `undefined` for a slot that cannot be read, which drafts can leave behind.
 */
export const startOfEntry = (timeslot: { date: string; time: string }): Date | undefined => {
  if (typeof timeslot.date !== 'string' || typeof timeslot.time !== 'string') return undefined;
  const slot = slotOf({ timeslot });
  const dayKey = dayKeyOf(timeslot.date);
  if (slot === undefined || dayKey === '') return undefined;
  return campInstantOf(dayKey, slot.start);
};

/**
 * The reminder pushes for an entry starting at `start` that are due at `now`: the one before it
 * once its lead time is reached, and the one at the start once it has started. Each stays due
 * for {@link REMINDER_GRACE_MINUTES}, and the one before the start ends with the start, where
 * the one at the start takes over.
 */
export const dueReminderPushes = (
  start: Date,
  timing: ReminderTiming,
  now: Date,
): DueReminderPush[] => {
  const due: DueReminderPush[] = [];
  const isDue = (at: Date): boolean =>
    at.getTime() <= now.getTime() && now.getTime() < at.getTime() + REMINDER_GRACE_MINUTES * MINUTE;

  if (timing.leadMinutes > 0) {
    const leadAt = new Date(start.getTime() - timing.leadMinutes * MINUTE);
    if (isDue(leadAt) && now.getTime() < start.getTime()) {
      due.push({ kind: 'LEAD', scheduledFor: leadAt });
    }
  }
  if (timing.atStart && isDue(start)) due.push({ kind: 'START', scheduledFor: start });
  return due;
};

/** Whether any timing a user can choose could make a reminder for `start` due at `now`. */
export const mayBeDue = (start: Date, now: Date): boolean => {
  const earliest = start.getTime() - Math.max(...REMINDER_LEAD_OPTIONS) * MINUTE;
  const latest = start.getTime() + REMINDER_GRACE_MINUTES * MINUTE;
  return earliest <= now.getTime() && now.getTime() < latest;
};

/** An entry that can remind: a slot of a programme block, or a shift. */
export interface RemindableEntry {
  id: string;
  type: 'PROGRAM' | 'SHIFT';
  start: Date;
}

/** A reminder somebody set, or switched off for an entry they are enrolled in. */
export interface StoredReminder {
  userId: string;
  entryId: string;
  enabled: boolean;
}

export interface StoredEnrollment {
  userId: string;
  courseId: string;
  courseType: 'PROGRAM' | 'SHIFT';
}

/** One push to one person. */
export interface DueReminder extends DueReminderPush {
  userId: string;
  entryId: string;
  /** the lead time it was due for, which its text says */
  leadMinutes: number;
}

/**
 * Who is reminded of an entry: everybody who set a reminder for it, and everybody enrolled in
 * it, except those who switched the reminder off.
 */
export const recipientsOf = (
  entry: Pick<RemindableEntry, 'id' | 'type'>,
  reminders: readonly StoredReminder[],
  enrollments: readonly StoredEnrollment[],
): Set<string> => {
  const recipients = new Set(
    enrollments
      .filter(({ courseId, courseType }) => courseId === entry.id && courseType === entry.type)
      .map(({ userId }) => userId),
  );
  for (const { userId, entryId, enabled } of reminders) {
    if (entryId !== entry.id) continue;
    if (enabled) recipients.add(userId);
    else recipients.delete(userId);
  }
  return recipients;
};

/**
 * Every reminder push due at `now`, for every person, each with that person's own timing. A
 * person without a stored timing gets {@link DEFAULT_REMINDER_TIMING}.
 */
export const resolveDueReminders = ({
  entries,
  reminders,
  enrollments,
  timings,
  now,
}: {
  entries: readonly RemindableEntry[];
  reminders: readonly StoredReminder[];
  enrollments: readonly StoredEnrollment[];
  timings: ReadonlyMap<string, ReminderTiming>;
  now: Date;
}): DueReminder[] =>
  entries.flatMap((entry) =>
    [...recipientsOf(entry, reminders, enrollments)].flatMap((userId) => {
      const timing = timings.get(userId) ?? DEFAULT_REMINDER_TIMING;
      return dueReminderPushes(entry.start, timing, now).map((push) => ({
        ...push,
        userId,
        entryId: entry.id,
        leadMinutes: timing.leadMinutes,
      }));
    }),
  );
