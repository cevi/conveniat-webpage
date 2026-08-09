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
 * Convert a frontend entry to a local DB record.
 */
const frontendTypeToRecord = (entry: CampScheduleEntryFrontendType): ScheduleEntryRecord => {
  return {
    ...entry,
    _syncedAt: Date.now(),
  } as ScheduleEntryRecord;
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
 * Write the server state into the local collection.
 *
 * The update callback has to *mutate* the draft it receives - TanStack DB derives the mutation
 * from the tracked property assignments and ignores the callback's return value, so returning a
 * new object silently produced an empty change set and left stale records in localStorage forever.
 */
const applyServerEntries = (serverEntries: CampScheduleEntryFrontendType[]): void => {
  const currentItems = [...scheduleEntriesCollection.state.values()];
  const currentIds = new Set(currentItems.map((item) => item.id));
  const serverIds = new Set(serverEntries.map((entry) => entry.id));

  // Update or insert entries
  for (const entry of serverEntries) {
    const record = frontendTypeToRecord(entry);
    try {
      if (currentIds.has(entry.id)) {
        scheduleEntriesCollection.update(entry.id, (draft) => {
          for (const key of Object.keys(draft)) {
            delete draft[key as keyof typeof draft];
          }
          Object.assign(draft, record);
        });
      } else {
        scheduleEntriesCollection.insert(record);
      }
    } catch (error) {
      reportSyncFailure(entry.id, error);
    }
  }

  // Remove entries that no longer exist on server
  for (const item of currentItems) {
    if (!serverIds.has(item.id)) {
      try {
        scheduleEntriesCollection.delete(item.id);
      } catch (error) {
        reportSyncFailure(item.id, error);
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
