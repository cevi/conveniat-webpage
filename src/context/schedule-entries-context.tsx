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
 * Convert a frontend entry to a local DB record.
 */
const frontendTypeToRecord = (entry: CampScheduleEntryFrontendType): ScheduleEntryRecord => {
  return {
    ...entry,
    _syncedAt: Date.now(),
  } as ScheduleEntryRecord;
};

export const ScheduleEntriesProvider: React.FC<ScheduleEntriesProviderProperties> = ({
  children,
  initialEntries,
}) => {
  const hasHydratedReference = useRef(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | undefined>();
  const { data: localEntries } = useLiveQuery(
    (q) => q.from({ entry: scheduleEntriesCollection }),
    [],
  );

  // Convert local DB records to frontend types
  const entries = useMemo(
    () => localEntries.map((record) => recordToFrontendType(record)),
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
      const currentItems = [...scheduleEntriesCollection.state.values()];
      const currentIds = new Set(currentItems.map((index_) => index_.id));
      const serverIds = new Set(initialEntries.map((event_) => event_.id));

      // Update or insert entries
      for (const entry of initialEntries) {
        if (currentIds.has(entry.id)) {
          // Update existing entry
          scheduleEntriesCollection.update(entry.id, () => frontendTypeToRecord(entry));
        } else {
          // Insert new entry
          scheduleEntriesCollection.insert(frontendTypeToRecord(entry));
        }
      }

      // Remove entries that no longer exist on server
      for (const item of currentItems) {
        if (!serverIds.has(item.id)) {
          scheduleEntriesCollection.delete(item.id);
        }
      }

      setLastSyncedAt(Date.now());
    }, SYNC_DEBOUNCE_MS);

    return (): void => {
      clearTimeout(timer);
    };
  }, [initialEntries]);

  // Manual sync function for imperative updates
  const syncFromServer = useCallback((serverEntries: CampScheduleEntryFrontendType[]) => {
    const currentItems = [...scheduleEntriesCollection.state.values()];
    const currentIds = new Set(currentItems.map((index_) => index_.id));
    const serverIds = new Set(serverEntries.map((event_) => event_.id));

    // Update or insert entries
    for (const entry of serverEntries) {
      if (currentIds.has(entry.id)) {
        scheduleEntriesCollection.update(entry.id, () => frontendTypeToRecord(entry));
      } else {
        scheduleEntriesCollection.insert(frontendTypeToRecord(entry));
      }
    }

    // Remove entries that no longer exist on server
    for (const item of currentItems) {
      if (!serverIds.has(item.id)) {
        scheduleEntriesCollection.delete(item.id);
      }
    }

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
