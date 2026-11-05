'use client';

import { trpc } from '@/trpc/client';
import React, { createContext, useContext, useEffect, useSyncExternalStore } from 'react';

/**
 * Status for a single course, matching the output of getCourseStatuses.
 */
export interface CourseStatus {
  enrolledCount: number;
  maxParticipants: number | undefined;
  isEnrolled: boolean;
  isAdmin: boolean;
  enableEnrolment: boolean | null | undefined;
  hideList: boolean | null | undefined;
  chatId: string | undefined;
}

interface ScheduleStatusState {
  statusMap: Record<string, CourseStatus>;
  isLoading: boolean;
  isOnline: boolean;
}

/**
 * Simple subscription-based store to avoid re-render storms.
 */
class ScheduleStatusStore {
  private state: ScheduleStatusState;
  private listeners = new Set<() => void>();

  constructor(initialState: ScheduleStatusState) {
    this.state = initialState;
  }

  getState = (): ScheduleStatusState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  setState(newState: ScheduleStatusState): void {
    // Simple shallow comparison to avoid unnecessary updates if possible,
    // though trpc usually returns fresh objects.
    if (
      this.state.statusMap === newState.statusMap &&
      this.state.isLoading === newState.isLoading &&
      this.state.isOnline === newState.isOnline
    ) {
      return;
    }
    this.state = newState;
    for (const listener of this.listeners) {
      listener();
    }
  }
}

const ScheduleStatusContext = createContext<ScheduleStatusStore | undefined>(undefined);

interface ScheduleStatusProviderProperties {
  courseIds: string[];
  isOnline: boolean;
  children: React.ReactNode;
}

const CHUNK_SIZE = 40;

/** How long the enrolment counts on screen may be old while the screen stays open. */
const STATUS_REFRESH_INTERVAL = 5 * 60 * 1000;

const chunkArray = <T,>(array: T[], size: number): T[][] => {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, index) =>
    array.slice(index * size, index * size + size),
  );
};

/**
 * Provider that fetches course statuses in bulk and distributes them via a subscription store.
 * This prevents all children from re-rendering when only one course status changes.
 */
export const ScheduleStatusProvider: React.FC<ScheduleStatusProviderProperties> = ({
  courseIds,
  isOnline,
  children,
}) => {
  const chunks = React.useMemo(() => chunkArray(courseIds, CHUNK_SIZE), [courseIds]);

  const queryResults = trpc.useQueries((t) =>
    chunks.map((chunk) =>
      t.schedule.getCourseStatuses(
        { courseIds: chunk },
        {
          staleTime: STATUS_REFRESH_INTERVAL,
          gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in cache for offline
          // Other people's enrolments reach no mutation of this client, so the counts only
          // change when we ask. The Programm stays mounted in a hidden Activity for as long as
          // the app lives, and the cache is restored from IndexedDB with its old timestamp, so
          // without these a count could stay hours old. Ask whenever the screen opens or the
          // app comes back, and every five minutes while it is in front; `networkMode:
          // 'online'` keeps the cached counts offline.
          refetchOnMount: 'always',
          refetchOnWindowFocus: true,
          refetchInterval: STATUS_REFRESH_INTERVAL,
        },
      ),
    ),
  );

  const isLoading = queryResults.some((q) => q.isLoading);
  const data = React.useMemo(() => {
    const combined: Record<string, CourseStatus> = {};
    for (const q of queryResults) {
      if (q.data) {
        Object.assign(combined, q.data);
      }
    }
    return combined;
  }, [queryResults]);

  // Initialize the store once. We use useState with a factory function to ensure
  // it's created only once and is stable across re-renders.
  // eslint-disable-next-line react-naming-convention/use-state
  const [store] = React.useState(
    () =>
      new ScheduleStatusStore({
        statusMap: data,
        isLoading,
        isOnline,
      }),
  );

  // Update the store when data/loading/online state changes.
  // This will notify all subscribers.
  useEffect(() => {
    store.setState({
      statusMap: data,
      isLoading,
      isOnline,
    });
  }, [data, isLoading, isOnline, store]);

  return <ScheduleStatusContext.Provider value={store}>{children}</ScheduleStatusContext.Provider>;
};

/**
 * Hook to get the status for a specific course ID.
 * Uses useSyncExternalStore to subscribe to only the state it needs.
 */
export const useCourseStatus = (
  courseId: string,
): {
  status: CourseStatus | undefined;
  isLoading: boolean;
  isOnline: boolean;
} => {
  const store = useContext(ScheduleStatusContext);

  if (!store) {
    throw new Error('useCourseStatus must be used within a ScheduleStatusProvider');
  }

  // We subscribe to the whole state but pick the relevant parts.
  // useSyncExternalStore handles the comparison and triggers re-render only if
  // the returned value (selected part) changes.
  const status = useSyncExternalStore(store.subscribe, () => store.getState().statusMap[courseId]);
  const isLoading = useSyncExternalStore(store.subscribe, () => store.getState().isLoading);
  const isOnline = useSyncExternalStore(store.subscribe, () => store.getState().isOnline);

  return {
    status,
    isLoading,
    isOnline,
  };
};
