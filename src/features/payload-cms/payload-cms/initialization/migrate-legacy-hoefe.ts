import { deriveHofName } from '@/features/payload-cms/payload-cms/utils/hof-name';
import type { Payload } from 'payload';

/** One row of the legacy event list on the `bill-settings` global, as it may be stored. */
export interface LegacyHofEventRow {
  eventId?: string | null;
  eventName?: string | null;
  groupId?: string | null;
  addressManagerEmails?: string | null;
  reminderRecipientsOverride?: string | null;
}

/** A Hof as the migration creates it. */
export interface MigratedHof {
  name: string;
  groupId: string;
  events: Array<{ eventId: string; eventName: string }>;
  addressManagerEmails?: string;
  reminderRecipientsOverride?: string;
}

/** A field whose rows of one group held different values; the first non-empty one won. */
export interface LegacyHofConflict {
  groupId: string;
  field: 'addressManagerEmails' | 'reminderRecipientsOverride';
  values: string[];
}

const trimmedText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/**
 * Groups the legacy per-event rows into one Hof per Cevi.DB group.
 *
 * Every row of a group carried its own copy of the group's addresses. They should agree, but
 * nothing ever forced them to: the first non-empty value is kept and the disagreement is
 * returned so it can be logged. A row without an event or a group id cannot be placed and is
 * counted instead. A row without a name keeps its id as name until the next sync replaces it.
 */
export const groupLegacyHofEvents = (
  rows: readonly LegacyHofEventRow[],
): { hoefe: MigratedHof[]; conflicts: LegacyHofConflict[]; skippedRows: number } => {
  const hoefe = new Map<string, MigratedHof>();
  const seenValues = new Map<string, Map<LegacyHofConflict['field'], Set<string>>>();
  /** The names the rows really had, without the id stand-ins, to name the Hof after. */
  const eventNames = new Map<string, string[]>();
  let skippedRows = 0;

  for (const row of rows) {
    const groupId = trimmedText(row.groupId);
    const eventId = trimmedText(row.eventId);
    if (groupId === '' || eventId === '') {
      skippedRows += 1;
      continue;
    }

    let hof = hoefe.get(groupId);
    if (hof === undefined) {
      hof = { name: '', groupId, events: [] };
      hoefe.set(groupId, hof);
      seenValues.set(groupId, new Map());
      eventNames.set(groupId, []);
    }

    if (!hof.events.some((event) => event.eventId === eventId)) {
      const eventName = trimmedText(row.eventName);
      hof.events.push({ eventId, eventName: eventName === '' ? eventId : eventName });
      if (eventName !== '') eventNames.get(groupId)?.push(eventName);
    }

    for (const field of ['addressManagerEmails', 'reminderRecipientsOverride'] as const) {
      const value = trimmedText(row[field]);
      if (value === '') continue;
      const values = seenValues.get(groupId);
      const seen = values?.get(field) ?? new Set<string>();
      seen.add(value);
      values?.set(field, seen);
      hof[field] ??= value;
    }
  }

  const conflicts: LegacyHofConflict[] = [];
  for (const [groupId, fields] of seenValues) {
    for (const [field, values] of fields) {
      if (values.size > 1) conflicts.push({ groupId, field, values: [...values] });
    }
  }

  for (const hof of hoefe.values()) {
    hof.name = deriveHofName(eventNames.get(hof.groupId) ?? [], hof.groupId);
  }

  return { hoefe: [...hoefe.values()], conflicts, skippedRows };
};

/**
 * Moves the Höfe out of the legacy event list of the `bill-settings` global into the `hoefe`
 * collection, once.
 *
 * Runs on every start and does nothing as soon as a single Hof exists, so it is safe to run
 * on every replica and every restart. Two replicas starting together may both find the
 * collection empty; the unique `groupId` turns the second create of a Hof into a refused
 * duplicate, which is logged and skipped. The legacy list itself is never modified.
 *
 * Remove together with the legacy `events` field of `bill-settings`.
 */
export const migrateLegacyHoefe = async (payload: Payload): Promise<void> => {
  try {
    const { totalDocs } = await payload.count({
      collection: 'hoefe',
      context: { internal: true },
    });
    if (totalDocs > 0) return;

    const settings = await payload.findGlobal({
      slug: 'bill-settings',
      depth: 0,
      context: { internal: true },
    });
    const rows: LegacyHofEventRow[] = Array.isArray(settings.events) ? settings.events : [];
    if (rows.length === 0) return;

    const { hoefe, conflicts, skippedRows } = groupLegacyHofEvents(rows);

    for (const conflict of conflicts) {
      payload.logger.warn(
        { groupId: conflict.groupId, field: conflict.field, values: conflict.values.length },
        'Legacy Hof rows of one group disagree; the migration kept the first non-empty value',
      );
    }
    if (skippedRows > 0) {
      payload.logger.warn(
        { skippedRows },
        'Legacy Hof rows without an event or group id were not migrated',
      );
    }

    let created = 0;
    for (const hof of hoefe) {
      try {
        await payload.create({ collection: 'hoefe', data: hof, context: { internal: true } });
        created += 1;
      } catch (error: unknown) {
        // Most likely another replica created this Hof a moment earlier.
        payload.logger.warn(
          { err: error, groupId: hof.groupId },
          'Could not create a Hof from the legacy bill settings',
        );
      }
    }

    payload.logger.info(
      { created, hoefe: hoefe.length, rows: rows.length },
      `Migrated ${String(created)} Höfe from the legacy bill settings events`,
    );
  } catch (error: unknown) {
    payload.logger.error({ err: error }, 'Migrating the legacy Höfe failed');
  }
};
