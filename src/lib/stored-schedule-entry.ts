import type { ScheduleEntryRecord } from '@/lib/tanstack-db';

/**
 * A schedule entry from the server in the form localStorage keeps it.
 *
 * tRPC hands over values JSON has no form for, like `undefined` inside an array of a Lexical
 * description. TanStack DB refuses such a row, and it does so when the write settles, not when
 * `insert()` returns: the whole batch rolls back without a throw, so a single entry emptied the
 * offline Programm. Taking the row through JSON first stores what a reload would read anyway.
 *
 * @param entry - The entry as the server sent it.
 * @param syncedAt - When this sync ran.
 * @returns The entry with `_syncedAt`, as plain JSON values.
 */
export const toStoredScheduleEntry = (entry: object, syncedAt: number): ScheduleEntryRecord =>
  // eslint-disable-next-line unicorn/prefer-structured-clone -- the clone has to lose what JSON loses
  JSON.parse(JSON.stringify({ ...entry, _syncedAt: syncedAt })) as ScheduleEntryRecord;
