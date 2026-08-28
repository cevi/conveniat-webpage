'use client';

import type { PopulateSubeventsStreamMessage, PopulatedSubevent } from '@/features/billing/types';
import { useCallback, useEffect, useRef, useState } from 'react';

const POPULATE_SUBEVENTS_ENDPOINT = '/api/confidential/billing/populate-subevents';

/**
 * `idle` before the first run, `walking` while the subgroups of Cevi.DB are queried,
 * `saving` once the walk finished and the merged list is being written, and `done` /
 * `error` once the stream closed.
 */
export type PopulateSubeventsPhase = 'idle' | 'walking' | 'saving' | 'done' | 'error';

export interface PopulateSubeventsState {
  phase: PopulateSubeventsPhase;
  processedGroups: number;
  totalGroups: number;
  /** Every event discovered so far, in discovery order. */
  foundEvents: PopulatedSubevent[];
  /** Event ids that were not in the settings before this run. Only filled on `done`. */
  newEventIds: Set<string>;
  /** Server-provided error message, if any. Undefined means "show a generic message". */
  error: string | undefined;
}

const INITIAL_STATE: PopulateSubeventsState = {
  phase: 'idle',
  processedGroups: 0,
  totalGroups: 0,
  foundEvents: [],
  newEventIds: new Set(),
  error: undefined,
};

/**
 * Splits a stream of newline-delimited JSON into whole lines, keeping the trailing
 * partial line in the buffer until the chunk that completes it arrives.
 */
async function* readNdjsonLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // The last element is either an empty string or an incomplete line.
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.trim().length > 0) yield line;
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (buffer.trim().length > 0) yield buffer;
}

/**
 * Runs the Cevi.DB subgroup-event import and exposes its live progress.
 *
 * The endpoint streams NDJSON while it walks the subgroups, so the caller can render a
 * progress bar and the event names as they are found instead of a 45 second spinner.
 */
export const usePopulateSubevents = (
  /**
   * Called once the settings were written, with the complete stored event list. Used to
   * push the result into the admin form so the array field updates without a reload.
   */
  onCompleted?: (allEvents: PopulatedSubevent[]) => void | Promise<void>,
): {
  state: PopulateSubeventsState;
  isRunning: boolean;
  start: () => Promise<void>;
  reset: () => void;
} => {
  const [state, setState] = useState<PopulateSubeventsState>(INITIAL_STATE);
  const isRunningReference = useRef(false);
  // Held in a ref so `start` stays stable even when the callback closes over form state.
  const onCompletedReference = useRef(onCompleted);
  useEffect((): void => {
    onCompletedReference.current = onCompleted;
  }, [onCompleted]);

  const reset = useCallback((): void => {
    if (isRunningReference.current) return;
    setState(INITIAL_STATE);
  }, []);

  const start = useCallback(async (): Promise<void> => {
    if (isRunningReference.current) return;
    isRunningReference.current = true;
    setState({ ...INITIAL_STATE, phase: 'walking' });

    try {
      const response = await fetch(POPULATE_SUBEVENTS_ENDPOINT, { method: 'POST' });

      if (!response.ok || response.body === null) {
        // Auth and other pre-stream failures still answer with a plain JSON body.
        const fallback = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(fallback.error ?? '');
      }

      for await (const line of readNdjsonLines(response.body)) {
        let message: PopulateSubeventsStreamMessage;
        try {
          message = JSON.parse(line) as PopulateSubeventsStreamMessage;
        } catch {
          continue;
        }

        if (message.type === 'progress') {
          const { processedGroups, totalGroups, foundEvents } = message;
          setState((previous) => ({
            ...previous,
            // The server writes the settings once the last group is walked; the UI
            // stays on that step until `done` arrives.
            phase: totalGroups > 0 && processedGroups >= totalGroups ? 'saving' : 'walking',
            processedGroups,
            totalGroups,
            foundEvents: [...previous.foundEvents, ...foundEvents],
          }));
        } else if (message.type === 'done') {
          const newEventIds = new Set(message.newEvents.map((event) => event.eventId));
          setState((previous) => ({
            ...previous,
            phase: 'done',
            processedGroups: previous.totalGroups,
            newEventIds,
          }));
          await onCompletedReference.current?.(message.allEvents);
        } else {
          setState((previous) => ({ ...previous, phase: 'error', error: message.error }));
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setState((previous) => ({
        ...previous,
        phase: 'error',
        error: message.length > 0 ? message : undefined,
      }));
    } finally {
      isRunningReference.current = false;
    }
  }, []);

  return {
    state,
    isRunning: state.phase === 'walking' || state.phase === 'saving',
    start,
    reset,
  };
};
