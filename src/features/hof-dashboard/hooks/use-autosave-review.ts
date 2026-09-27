'use client';

import type { HofReviewStatus } from '@/features/hof-dashboard/constants';
import { useWarnBeforeLeaving } from '@/features/hof-dashboard/hooks/use-warn-before-leaving';
import { trpc } from '@/trpc/client';
import { useCallback, useEffect, useRef, useState } from 'react';

/** How long typing has to pause before the feedback is saved. */
const DEBOUNCE_MS = 800;

/** What a reviewer set: the Ressort's status, none for "handed in", and the feedback. */
export interface ReviewValues {
  status: HofReviewStatus | undefined;
  feedback: string;
}

/**
 * Where the review's autosave stands. `saved` only once the server answered, so the status
 * never claims a write that did not land.
 */
export type AutosaveState = 'idle' | 'typing' | 'saving' | 'saved' | 'offline' | 'error';

const same = (a: ReviewValues, b: ReviewValues): boolean =>
  a.status === b.status && a.feedback === b.feedback;

/**
 * Saves a reviewer's answer as it is given: a status at once, the feedback after a pause in
 * typing, one write at a time and always the latest values. Without signal the change waits
 * and goes out once the device is back online; a failed write stays until retried. Leaving
 * the page while something is not saved asks first.
 */
export const useAutosaveReview = (
  hofId: string,
  submissionId: string,
  stored: ReviewValues,
): {
  values: ReviewValues;
  setStatus: (status: HofReviewStatus | undefined) => void;
  setFeedback: (feedback: string) => void;
  state: AutosaveState;
  retry: () => void;
} => {
  const utils = trpc.useUtils();
  const mutation = trpc.hofDashboard.updateSubmissionReview.useMutation({ networkMode: 'always' });
  const [values, setValues] = useState(stored);
  const [state, setState] = useState<AutosaveState>('idle');
  const lastSaved = useRef(stored);
  const inFlight = useRef(false);
  const latest = useRef(stored);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
      setState(wrote ? 'saved' : 'idle');
      if (wrote) await utils.hofDashboard.getHofDashboard.invalidate({ hofId });
    } catch {
      setState(globalThis.navigator.onLine ? 'error' : 'offline');
    } finally {
      inFlight.current = false;
    }
  }, [hofId, submissionId, mutation, utils]);

  const change = (next: ReviewValues, debounce: boolean): void => {
    latest.current = next;
    setValues(next);
    clearTimeout(timer.current);
    if (debounce) {
      setState('typing');
      timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
    } else {
      void flush();
    }
  };

  useAutosaveOnReconnect(state, flush);
  useEffect(() => (): void => clearTimeout(timer.current), []);
  useWarnBeforeLeaving(
    state === 'typing' || state === 'saving' || state === 'offline' || state === 'error',
  );

  return {
    values,
    setStatus: (status) => change({ ...latest.current, status }, false),
    setFeedback: (feedback) => change({ ...latest.current, feedback }, true),
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
