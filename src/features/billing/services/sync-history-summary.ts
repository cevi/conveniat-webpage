/**
 * Folding a participant's sync history into something an operator can read.
 *
 * Kept free of Payload and React imports so it can be tested on its own — the admin field
 * that renders it is a client component.
 */

export interface SyncHistoryEntry {
  date: string;
  action: string;
  diff?: Record<string, { from: string; to: string }>;
  /** The value written back to the Cevi.DB. */
  value?: string;
  /** Why an already-billed row was parked for manual inspection. */
  reviewReason?: string;
}

/** A single entry, shown in full. */
export interface SyncHistoryEntrySection {
  kind: 'entry';
  entry: SyncHistoryEntry;
}

/** A run of consecutive entries that only recorded that a sync had happened. */
export interface SyncHistoryRunSection {
  kind: 'run';
  entries: SyncHistoryEntry[];
  /** How often each action occurs in the run, most frequent first. */
  actionCounts: { action: string; count: number }[];
  /** The fields that changed anywhere in the run, in first-seen order. */
  changedFields: string[];
}

export type SyncHistorySection = SyncHistoryEntrySection | SyncHistoryRunSection;

/**
 * Fields a sync rewrites on its own, without anybody changing anything in the Cevi.DB.
 *
 * The validation result is derived from the registration answers, and an answer that is
 * only sometimes returned makes it flap between two values for days. That is worth seeing
 * once, not three hundred times.
 */
const DERIVED_FIELDS = new Set(['missingStammdaten', 'missingAnmeldeangaben']);

/**
 * Actions that say "the sync looked and carried on". Everything else — the first sync, a
 * bill, a removal, a write-back to the Cevi.DB — is a step in this participation's story
 * and is always shown on its own.
 */
const ROUTINE_ACTIONS = new Set([
  'sync_confirmed',
  'participant_updated',
  'manual_review_required',
]);

/**
 * Decides whether an entry can disappear into a run.
 *
 * An entry survives as soon as it carries something a person wrote or decided: a reason,
 * a status change, or a change to a field that comes from the Cevi.DB rather than from our
 * own validation.
 */
const isRoutine = (entry: SyncHistoryEntry): boolean => {
  if (!ROUTINE_ACTIONS.has(entry.action)) return false;
  if (entry.reviewReason !== undefined && entry.reviewReason !== '') return false;
  return Object.keys(entry.diff ?? {}).every((field) => DERIVED_FIELDS.has(field));
};

const summarizeRun = (entries: SyncHistoryEntry[]): SyncHistoryRunSection => {
  const counts = new Map<string, number>();
  const changedFields: string[] = [];

  for (const entry of entries) {
    counts.set(entry.action, (counts.get(entry.action) ?? 0) + 1);
    for (const field of Object.keys(entry.diff ?? {})) {
      if (!changedFields.includes(field)) changedFields.push(field);
    }
  }

  return {
    kind: 'run',
    entries,
    actionCounts: [...counts]
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count),
    changedFields,
  };
};

/**
 * Groups consecutive routine entries into one run and leaves everything else alone.
 *
 * A run of one is not a run: a history where nothing repeats comes back unchanged, which
 * is what a participation that is synced once a night looks like.
 */
export const summarizeSyncHistory = (entries: SyncHistoryEntry[]): SyncHistorySection[] => {
  const sections: SyncHistorySection[] = [];
  let run: SyncHistoryEntry[] = [];

  const flushRun = (): void => {
    if (run.length === 0) return;
    sections.push(
      run.length === 1 && run[0] !== undefined
        ? { kind: 'entry', entry: run[0] }
        : summarizeRun(run),
    );
    run = [];
  };

  for (const entry of entries) {
    if (isRoutine(entry)) {
      run.push(entry);
      continue;
    }
    flushRun();
    sections.push({ kind: 'entry', entry });
  }
  flushRun();

  return sections;
};
