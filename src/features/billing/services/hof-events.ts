import type { HofEventRow } from '@/features/billing/types';
import type { Hof } from '@/features/payload-cms/payload-types';

interface HofForFlattening {
  groupId: Hof['groupId'];
  events?: Hof['events'] | undefined;
  addressManagerEmails?: Hof['addressManagerEmails'] | undefined;
  reminderRecipientsOverride?: Hof['reminderRecipientsOverride'] | undefined;
}

const presentText = (value: string | null | undefined): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

/**
 * Turns the Höfe into one row per event, each carrying the group and the reminder addresses
 * of its Hof — the shape the event list of the bill settings had, and the one the sync, the
 * reminders and the populate button still work on.
 *
 * Empty and missing addresses are left out rather than passed on as `''` or `null`, so a
 * row reads the same whether the field was never filled or cleared by an editor.
 */
export const flattenHofEvents = (hoefe: readonly HofForFlattening[]): HofEventRow[] =>
  hoefe.flatMap((hof) => {
    const addressManagerEmails = presentText(hof.addressManagerEmails);
    const reminderRecipientsOverride = presentText(hof.reminderRecipientsOverride);
    return (hof.events ?? []).map((event): HofEventRow => ({
      eventId: event.eventId,
      eventName: event.eventName,
      groupId: hof.groupId,
      ...(addressManagerEmails === undefined ? {} : { addressManagerEmails }),
      ...(reminderRecipientsOverride === undefined ? {} : { reminderRecipientsOverride }),
    }));
  });
