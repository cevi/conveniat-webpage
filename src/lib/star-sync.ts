import type { StarRecord } from '@/lib/tanstack-db';

/**
 * How the stars of a device and of the database become one set.
 *
 * The device stores a row per star it knows of. A row the database has not confirmed yet is a
 * change to send, a removal included: an unstarred row stays as `starred: false` until the
 * database has heard of it. Once the database answers, it is the truth for every row it was told
 * about and for every row that was already confirmed, so a star removed on another device goes
 * here too. Only rows changed while the request was out stay as they are, for the next sync.
 *
 * Kept free of the collection itself, so the server can share the limit below.
 */

/** The most changes one sync sends; a device with more sends the rest right after. */
export const MAX_STAR_CHANGES_PER_SYNC = 500;

/** What a star is now on the device, as the database should store it. */
export interface StarChange {
  courseId: string;
  starred: boolean;
}

/** The changes one sync sends, and the version of each row it sent. */
export interface StarSyncBatch {
  changes: StarChange[];
  sentAt: Map<string, number>;
}

/** The writes that bring the local rows in line with the database's answer. */
export interface StarRowWrites {
  insert: StarRecord[];
  update: StarRecord[];
  delete: string[];
}

/**
 * Whether a row shows a star. Rows stored before removals were kept have no `starred` field.
 *
 * @param row - The stored row.
 * @returns `false` only for a removal still waiting to be synced.
 */
export const isStarredRow = (row: StarRecord): boolean => row.starred !== false;

/**
 * Whether the database has yet to hear of a row.
 *
 * @param row - The stored row.
 * @returns `true` for every row the database has not confirmed, including rows from before this
 *   field existed.
 */
export const isPendingRow = (row: StarRecord): boolean => row.synced !== true;

/**
 * The changes the next sync sends.
 *
 * @param rows - Every stored row.
 * @returns At most `MAX_STAR_CHANGES_PER_SYNC` changes and the version each was sent at.
 */
export const pendingStarChanges = (rows: StarRecord[]): StarSyncBatch => {
  const pending = rows.filter((row) => isPendingRow(row)).slice(0, MAX_STAR_CHANGES_PER_SYNC);
  return {
    changes: pending.map((row) => ({ courseId: row.id, starred: isStarredRow(row) })),
    sentAt: new Map(pending.map((row) => [row.id, row.starredAt])),
  };
};

/**
 * The writes that take over the database's stars.
 *
 * @param rows - Every stored row, read after the answer arrived.
 * @param sentAt - The version of each row the sync sent.
 * @param remoteIds - Every star the database holds for the user.
 * @param now - The timestamp new rows get.
 * @returns The rows to insert, update and delete.
 */
export const reconcileStars = (
  rows: StarRecord[],
  sentAt: Map<string, number>,
  remoteIds: string[],
  now: number,
): StarRowWrites => {
  const remote = new Set(remoteIds);
  const local = new Set<string>();
  const writes: StarRowWrites = { insert: [], update: [], delete: [] };

  for (const row of rows) {
    local.add(row.id);
    // changed while the request was out, or not sent at all: the next sync carries it
    if (isPendingRow(row) && sentAt.get(row.id) !== row.starredAt) continue;

    if (!remote.has(row.id)) {
      writes.delete.push(row.id);
    } else if (!isStarredRow(row) || isPendingRow(row)) {
      // a confirmed addition, or a removal the database undid, as it does for an organiser's
      // own block
      writes.update.push({ ...row, starred: true, synced: true });
    }
  }

  for (const id of remote) {
    if (!local.has(id)) writes.insert.push({ id, starredAt: now, starred: true, synced: true });
  }

  return writes;
};
