'use client';

import { readNdjsonLines } from '@/features/payload-cms/payload-cms/utils/read-ndjson-lines';
import type {
  FoundFunktionGroup,
  FunktionenSyncResult,
  FunktionenSyncStreamMessage,
} from '@/features/payload-cms/payload-cms/utils/sync-funktionen';
import { useCallback, useEffect, useRef, useState } from 'react';

const FUNKTIONEN_SYNC_ENDPOINT = '/api/funktionen/sync';

/**
 * `discovering` while the Cevi.DB group tree is walked, `reading` while the leaders of each
 * group are read, then `done` or `error`.
 */
export type FunktionenSyncPhase = 'idle' | 'discovering' | 'reading' | 'done' | 'error';

export interface FunktionenSyncState {
  phase: FunktionenSyncPhase;
  discoveredGroups: number;
  processedGroups: number;
  totalGroups: number;
  /** every group with leaders found so far, in the order they were read */
  found: FoundFunktionGroup[];
  result: FunktionenSyncResult | undefined;
  /** the server's message; undefined means "show a generic one" */
  error: string | undefined;
}

const INITIAL_STATE: FunktionenSyncState = {
  phase: 'idle',
  discoveredGroups: 0,
  processedGroups: 0,
  totalGroups: 0,
  found: [],
  result: undefined,
  error: undefined,
};

/**
 * Runs the Cevi.DB sync of the camp functions and exposes its live progress, read from the
 * stream the endpoint writes while it walks the group tree.
 */
export const useFunktionenSync = (
  /** called once the functions are written, to reload the list below */
  onCompleted?: () => void | Promise<void>,
): { state: FunktionenSyncState; isRunning: boolean; start: () => Promise<void> } => {
  const [state, setState] = useState<FunktionenSyncState>(INITIAL_STATE);
  const isRunningReference = useRef(false);
  // held in a ref so `start` stays stable
  const onCompletedReference = useRef(onCompleted);
  useEffect((): void => {
    onCompletedReference.current = onCompleted;
  }, [onCompleted]);

  const start = useCallback(async (): Promise<void> => {
    if (isRunningReference.current) return;
    isRunningReference.current = true;
    setState({ ...INITIAL_STATE, phase: 'discovering' });

    try {
      const response = await fetch(FUNKTIONEN_SYNC_ENDPOINT, { method: 'POST' });
      if (!response.ok || response.body === null) {
        // refusals before the stream starts still answer with a JSON body
        const fallback = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(fallback.error ?? '');
      }

      for await (const line of readNdjsonLines(response.body)) {
        let message: FunktionenSyncStreamMessage;
        try {
          message = JSON.parse(line) as FunktionenSyncStreamMessage;
        } catch {
          continue;
        }

        if (message.type === 'progress' && message.phase === 'discovering') {
          const { discoveredGroups } = message;
          setState((previous) => ({ ...previous, phase: 'discovering', discoveredGroups }));
        } else if (message.type === 'progress') {
          const { processedGroups, totalGroups, found } = message;
          setState((previous) => ({
            ...previous,
            phase: 'reading',
            processedGroups,
            totalGroups,
            found: [...previous.found, ...found],
          }));
        } else if (message.type === 'done') {
          const { result } = message;
          setState((previous) => ({ ...previous, phase: 'done', result }));
          await onCompletedReference.current?.();
        } else {
          const { error } = message;
          setState((previous) => ({ ...previous, phase: 'error', error }));
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      setState((previous) => ({
        ...previous,
        phase: 'error',
        error: message === '' ? undefined : message,
      }));
    } finally {
      isRunningReference.current = false;
    }
  }, []);

  return {
    state,
    isRunning: state.phase === 'discovering' || state.phase === 'reading',
    start,
  };
};
