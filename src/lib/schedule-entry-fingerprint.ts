/**
 * What decides whether a stored schedule entry has to be written again.
 *
 * A row read back from the collection carries TanStack DB's virtual props (`$origin`, `$key`,
 * `$collectionId`, ...) as enumerable fields, which a record from the server never has. Comparing
 * whole rows therefore never matched, and every sync rewrote every entry into localStorage, the
 * full-collection write storm the comparison exists to prevent. `_syncedAt` changes on every sync
 * by definition. No field of a schedule entry starts with `$`.
 *
 * @param record - A stored row or a record about to be stored.
 * @returns The same string for the same content.
 */
export const scheduleEntryFingerprint = (record: object): string =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(record).filter(([key]) => key !== '_syncedAt' && !key.startsWith('$')),
    ),
  );
