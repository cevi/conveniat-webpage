'use client';
import type { HofReviewChoice } from '@/features/hof-dashboard/constants';
import { useWarnBeforeLeaving } from '@/features/hof-dashboard/hooks/use-warn-before-leaving';
import { useTRPC } from '@/trpc/client';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * What a reviewer set: the Ressort's answer, none for "handed in", and whether the version is
 * final. A comment is sent on its own, not saved as it is typed.
 */
export interface ReviewValues {
  status: HofReviewChoice | undefined;
  final: boolean;
}

/**
 * Where the review's autosave stands. `saved` only once the server answered, so the status
 * never claims a write that did not land.
 */
export type AutosaveState = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

const same = (a: ReviewValues, b: ReviewValues): boolean =>
  a.status === b.status && a.final === b.final;

/**
 * Saves a reviewer's answer as it is given, one write at a time and always the latest values. Without signal the change waits
 * and goes out once the device is back online; a failed write stays until retried. Leaving
 * the page while something is not saved asks first.
 */
export const useAutosaveReview = (
  hofId: string,
  submissionId: string,
  stored: ReviewValues,
): {
  values: ReviewValues;
  setStatus: (status: HofReviewChoice | undefined) => void;
  setFinal: (final: boolean) => void;
  state: AutosaveState;
  retry: () => void;
} => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const mutation = useMutation(trpc.hofDashboard.updateSubmissionReview.mutationOptions());
  const [values, setValues] = useState(stored);
  const [state, setState] = useState<AutosaveState>('idle');
  const lastSaved = useRef(stored);
  const inFlight = useRef(false);
  const latest = useRef(stored);

  const flush = useCallback(async (): Promise<void> => {
    // the write under way sends whatever was changed meanwhile once it is done
    if (inFlight.current) return;
    inFlight.current = true;
    let wrote = false;
    try {
      while (!same(latest.current, lastSaved.current)) {
        if (!globalThis.navigator.onLine) {
          setState('offline');
          return;
        }
        const next = latest.current;
        setState('saving');
        await mutation.mutateAsync({ hofId, submissionId, ...next });
        lastSaved.current = next;
        wrote = true;
      }
    } catch {
      setState(globalThis.navigator.onLine ? 'error' : 'offline');
      return;
    } finally {
      inFlight.current = false;
    }
    setState(wrote ? 'saved' : 'idle');
    // Reloading the dashboard is not part of the write. A change made while it reloaded used to
    // find the write still under way and leave itself to it, after that write had stopped
    // looking: it was never sent, and the pill said saved.
    if (wrote)
      await queryClient.invalidateQueries(trpc.hofDashboard.getHofDashboard.queryFilter({ hofId }));
  }, [hofId, submissionId, mutation, queryClient, trpc]);

  const change = (next: ReviewValues): void => {
    latest.current = next;
    setValues(next);
    void flush();
  };

  useAutosaveOnReconnect(state, flush);
  useWarnBeforeLeaving(state === 'saving' || state === 'offline' || state === 'error');

  return {
    values,
    setStatus: (status) => change({ ...latest.current, status }),
    setFinal: (final) => change({ ...latest.current, final }),
    state,
    retry: () => void flush(),
  };
};

/** Sends what waited for signal as soon as the device is back online. */
const useAutosaveOnReconnect = (state: AutosaveState, flush: () => Promise<void>): void => {
  useEffect(() => {
    if (state !== 'offline') return;
    const online = (): void => void flush();
    globalThis.addEventListener('online', online);
    return (): void => globalThis.removeEventListener('online', online);
  }, [state, flush]);
};
