'use client';

import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { scheduleEntriesCollection, type ScheduleEntryRecord } from '@/lib/tanstack-db';
import { useLiveQuery } from '@tanstack/react-db';
import type React from 'react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const SYNC_DEBOUNCE_MS = 500;

export interface ScheduleEntriesContextType {
  /** All schedule entries from local DB */
  entries: CampScheduleEntryFrontendType[];
  /** Whether entries are loaded from local storage */
  isReady: boolean;
  /** Sync server entries to local DB */
  syncFromServer: (serverEntries: CampScheduleEntryFrontendType[]) => void;
  /** Get entries for a specific date */
  getEntriesForDate: (date: Date) => CampScheduleEntryFrontendType[];
  /** Last sync timestamp */
  lastSyncedAt: number | undefined;
}

export interface ScheduleEntriesProviderProperties {
  children: ReactNode;
  /** Initial entries from server (for SSR hydration) */
  initialEntries?: CampScheduleEntryFrontendType[];
}

export const ScheduleEntriesContext = createContext<ScheduleEntriesContextType | undefined>(
  undefined,
);

/**
 * Convert a schedule entry record from local DB to frontend type.
 * The main difference is the _syncedAt metadata field.
 */
const recordToFrontendType = (record: ScheduleEntryRecord): CampScheduleEntryFrontendType => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _syncedAt, ...entry } = record;
  return entry as CampScheduleEntryFrontendType;
};

/**
 * Whether a record read back from localStorage is usable.
 *
 * Records restored from storage are *not* validated against the collection schema - TanStack DB
 * only checks that they are JSON-serialisable. A record written by an older app version can
 * therefore be missing fields the current UI dereferences unconditionally, so anything without a
 * usable timeslot is dropped instead of rendered.
 */
const isRenderableRecord = (record: ScheduleEntryRecord): boolean => {
  // The declared type is a lie for records written by an older app version - re-check at runtime.
  const timeslot = record.timeslot as { date?: unknown; time?: unknown } | undefined;
  return (
    typeof record.id === 'string' &&
    typeof record.title === 'string' &&
    typeof timeslot?.date === 'string' &&
    typeof timeslot.time === 'string'
  );
};

/**
 * Report a failed entry sync without taking the page down.
 *
 * A single malformed entry (e.g. a dangling relation the collection schema rejects) must never
 * escape the sync effect: React would forward the throw to the nearest error boundary and replace
 * the whole schedule page with the generic error screen.
 */
const reportSyncFailure = (entryId: string, error: unknown): void => {
  console.error(`[ScheduleEntries] Failed to sync entry "${entryId}" to local DB:`, error);
  void import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.captureException(error, {
        context: 'schedule-entries-sync',
        entryId,
      });
    })
    .catch(() => {
      /* reporting is best effort */
    });
};

/**
 * Serialises a record ignoring `_syncedAt`, which changes on every sync by definition and would
 * otherwise mark every entry as modified.
 */
const contentFingerprint = (record: object): string =>
  JSON.stringify({ ...record, _syncedAt: undefined });

/**
 * Overwrite a draft in place.
 *
 * The update callback has to *mutate* the draft it receives - TanStack DB derives the mutation
 * from the tracked property assignments and ignores the callback's return value, so returning a
 * new object silently produced an empty change set and left stale records in localStorage forever.
 */
const overwriteDraft = (draft: Record<string, unknown>, record: ScheduleEntryRecord): void => {
  for (const key of Object.keys(draft)) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete draft[key];
  }
  Object.assign(draft, record);
};

/**
 * Write the server state into the local collection.
 *
 * Every write is batched. The localStorage-backed collection re-serialises and rewrites the
 * *whole* collection on each mutation, so the previous one-call-per-entry loop turned a sync of
 * ~485 entries carrying Lexical descriptions into ~485 full-collection JSON writes on the main
 * thread - and `useLiveQuery` re-rendered on each one. This runs on every visit to the schedule
 * (the overview calls syncFromServer from an effect), which is what made a cold navigation to
 * /app/schedule take seconds. Entries whose content is unchanged are skipped entirely, so a
 * repeat visit writes nothing at all.
 *
 * A batch that throws falls back to per-entry writes: a single malformed entry (e.g. a dangling
 * relation the collection schema rejects) must never escape this function, or React forwards the
 * throw to the nearest error boundary and replaces the whole schedule page with the error screen.
 */
const applyServerEntries = (serverEntries: CampScheduleEntryFrontendType[]): void => {
  const currentItems = [...scheduleEntriesCollection.state.values()];
  const currentById = new Map(currentItems.map((item) => [item.id, item]));
  const serverIds = new Set(serverEntries.map((entry) => entry.id));

  const syncedAt = Date.now();
  const toInsert: ScheduleEntryRecord[] = [];
  const updateKeys: string[] = [];
  const updateById = new Map<string, ScheduleEntryRecord>();

  for (const entry of serverEntries) {
    const record = { ...entry, _syncedAt: syncedAt } as unknown as ScheduleEntryRecord;
    const current = currentById.get(entry.id);

    if (current === undefined) {
      toInsert.push(record);
      continue;
    }
    if (contentFingerprint(current) === contentFingerprint(record)) continue;

    updateKeys.push(entry.id);
    updateById.set(entry.id, record);
  }

  const toDelete = currentItems.filter((item) => !serverIds.has(item.id)).map((item) => item.id);

  if (toInsert.length > 0) {
    try {
      scheduleEntriesCollection.insert(toInsert);
    } catch {
      for (const record of toInsert) {
        try {
          scheduleEntriesCollection.insert(record);
        } catch (error) {
          reportSyncFailure(record.id, error);
        }
      }
    }
  }

  if (updateKeys.length > 0) {
    try {
      scheduleEntriesCollection.update(updateKeys, (drafts) => {
        for (const draft of drafts) {
          const record = updateById.get(draft.id);
          if (record === undefined) continue;
          overwriteDraft(draft, record);
        }
      });
    } catch {
      for (const key of updateKeys) {
        const record = updateById.get(key);
        if (record === undefined) continue;
        try {
          scheduleEntriesCollection.update(key, (draft) => {
            overwriteDraft(draft, record);
          });
        } catch (error) {
          reportSyncFailure(key, error);
        }
      }
    }
  }

  if (toDelete.length > 0) {
    try {
      scheduleEntriesCollection.delete(toDelete);
    } catch {
      for (const id of toDelete) {
        try {
          scheduleEntriesCollection.delete(id);
        } catch (error) {
          reportSyncFailure(id, error);
        }
      }
    }
  }
};

export const ScheduleEntriesProvider: React.FC<ScheduleEntriesProviderProperties> = ({
  children,
  initialEntries,
}) => {
  const hasHydratedReference = useRef(false);
  const hasSyncedReference = useRef(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | undefined>();
  const { data: localEntries } = useLiveQuery(
    (q) => q.from({ entry: scheduleEntriesCollection }),
    [],
  );

  // Convert local DB records to frontend types
  const entries = useMemo(
    () =>
      localEntries
        .filter((record) => isRenderableRecord(record))
        .map((record) => recordToFrontendType(record)),
    [localEntries],
  );

  // Track last sync time from stored entries
  useEffect(() => {
    if (localEntries.length > 0) {
      const maxSyncedAt = Math.max(...localEntries.map((event_) => event_._syncedAt ?? 0));
      if (maxSyncedAt > 0) {
        queueMicrotask(() => {
          setLastSyncedAt(maxSyncedAt);
        });
      }
    }
  }, [localEntries]);

  // Hydrate local DB with initial entries from server (SSR)
  useEffect(() => {
    if (hasHydratedReference.current || !initialEntries || initialEntries.length === 0) return;
    hasHydratedReference.current = true;

    // Debounce to avoid race conditions with other effects
    const timer = setTimeout(() => {
      if (hasSyncedReference.current) return;
      applyServerEntries(initialEntries);
      setLastSyncedAt(Date.now());
    }, SYNC_DEBOUNCE_MS);

    return (): void => {
      clearTimeout(timer);
    };
  }, [initialEntries]);

  // Manual sync function for imperative updates
  const syncFromServer = useCallback((serverEntries: CampScheduleEntryFrontendType[]) => {
    hasSyncedReference.current = true;
    applyServerEntries(serverEntries);
    setLastSyncedAt(Date.now());
  }, []);

  // Helper to get entries for a specific date
  const getEntriesForDate = useCallback(
    (date: Date): CampScheduleEntryFrontendType[] => {
      const dateString = date.toISOString().split('T')[0] ?? '';
      return entries.filter((entry) => entry.timeslot.date.startsWith(dateString));
    },
    [entries],
  );

  const isReady = true;

  const contextValue = useMemo(
    () => ({
      entries,
      isReady,
      syncFromServer,
      getEntriesForDate,
      lastSyncedAt,
    }),
    [entries, isReady, syncFromServer, getEntriesForDate, lastSyncedAt],
  );

  return (
    <ScheduleEntriesContext.Provider value={contextValue}>
      {children}
    </ScheduleEntriesContext.Provider>
  );
};

/**
 * Hook to access schedule entries from local DB.
 */
export const useScheduleEntries = (): ScheduleEntriesContextType => {
  const context = useContext(ScheduleEntriesContext);
  if (context === undefined) {
    throw new Error('useScheduleEntries must be used within a ScheduleEntriesProvider');
  }
  return context;
};
