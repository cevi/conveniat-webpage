'use client';

import type { BillingAdminDocumentKey } from '@/features/billing/admin-documents';
import { useListQuery } from '@payloadcms/ui';
import { useCallback, useEffect, useRef, useState } from 'react';

/** The three steps of the billing pipeline, in the order they must run. */
export const BILLING_TASKS = ['sync', 'generate', 'send'] as const;
export type BillingTaskKey = (typeof BILLING_TASKS)[number];

/** Maps the UI's short task keys onto the slugs the job queue and cancel endpoint use. */
const TASK_SLUGS: Record<BillingTaskKey, string> = {
  sync: 'syncParticipants',
  generate: 'generateBills',
  send: 'sendBills',
};

const ACTIVE_JOBS_STORAGE_KEY = 'billing_active_jobs';
const POLL_INTERVAL_MS = 2000;

export interface BillingJobProgressView {
  processedItems: number;
  totalItems: number;
  currentItemName: string;
  runningSummary: Record<string, number>;
  startedAt: string;
}

export interface BillingJobView {
  id: string;
  status: 'pending' | 'failed' | 'success';
  summary?: Record<string, unknown>;
  error?: string;
  updatedAt: string;
  /** Only present while the job is running and reporting. */
  progress?: BillingJobProgressView;
}

type ActiveJobs = Partial<Record<BillingTaskKey, string>>;
type JobsByTask = Record<BillingTaskKey, BillingJobView | undefined>;

interface StatusResponse {
  success: boolean;
  sync?: BillingJobView;
  generate?: BillingJobView;
  send?: BillingJobView;
  capabilities?: { regenerateAll?: boolean; availableDocuments?: string[] };
}

const readStoredActiveJobs = (): ActiveJobs => {
  // eslint-disable-next-line unicorn/prefer-global-this
  if (typeof window === 'undefined') return {};
  try {
    const stored = globalThis.localStorage.getItem(ACTIVE_JOBS_STORAGE_KEY);
    if (stored === null || stored === '') return {};
    return JSON.parse(stored) as ActiveJobs;
  } catch {
    // A corrupt entry just means we lose the "keep polling across a reload" nicety.
    return {};
  }
};

/**
 * Owns the state of the three billing background jobs: what is running, how far along it
 * is, and what the last run produced.
 *
 * Jobs are tracked in `localStorage` so that reloading the page mid-run keeps polling
 * rather than silently dropping the run, and the list table is reloaded whenever a job
 * finishes — the rows live in Payload's ListQuery provider, which a router refresh does
 * not touch.
 */
export const useBillingJobs = (): {
  jobs: JobsByTask;
  isPending: Record<BillingTaskKey, boolean>;
  isCancelling: Record<BillingTaskKey, boolean>;
  isBusy: boolean;
  actionError: string | undefined;
  startJob: (task: BillingTaskKey) => Promise<void>;
  cancelJob: (task: BillingTaskKey) => Promise<void>;
  regenerateAll: () => Promise<void>;
  isRegenerating: boolean;
  /** False unless the deployment enabled `BILLING_ALLOW_REGENERATE_ALL`. */
  canRegenerateAll: boolean;
  /** Settings pages that exist in this admin panel and can therefore be linked to. */
  availableDocuments: BillingAdminDocumentKey[];
} => {
  const { query, refineListData } = useListQuery();

  const [jobs, setJobs] = useState<JobsByTask>({
    sync: undefined,
    generate: undefined,
    send: undefined,
  });
  const [activeJobs, setActiveJobs] = useState<ActiveJobs>(readStoredActiveJobs);
  const [startingTask, setStartingTask] = useState<BillingTaskKey | undefined>();
  const [cancellingTasks, setCancellingTasks] = useState<Partial<Record<BillingTaskKey, boolean>>>(
    {},
  );
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();
  // Assume not allowed until the server says otherwise, so the destructive action is
  // never offered on a deployment that would refuse it.
  const [canRegenerateAll, setCanRegenerateAll] = useState(false);
  const [availableDocuments, setAvailableDocuments] = useState<BillingAdminDocumentKey[]>([]);

  useEffect((): void => {
    // eslint-disable-next-line unicorn/prefer-global-this
    if (typeof window === 'undefined') return;
    globalThis.localStorage.setItem(ACTIVE_JOBS_STORAGE_KEY, JSON.stringify(activeJobs));
  }, [activeJobs]);

  const fetchStatuses = useCallback(async (): Promise<StatusResponse | undefined> => {
    try {
      const response = await fetch('/api/confidential/billing/sync-status');
      const data = (await response.json()) as StatusResponse;
      if (data.success !== true) return undefined;

      setJobs({ sync: data.sync, generate: data.generate, send: data.send });
      setCanRegenerateAll(data.capabilities?.regenerateAll === true);
      setAvailableDocuments(
        (data.capabilities?.availableDocuments ?? []) as BillingAdminDocumentKey[],
      );

      // Adopt jobs started elsewhere (another tab, or before a reload wiped the entry).
      const pendingJobs: ActiveJobs = {};
      for (const task of BILLING_TASKS) {
        const job = data[task];
        if (job?.status === 'pending') pendingJobs[task] = job.id;
      }
      if (Object.keys(pendingJobs).length > 0) {
        setActiveJobs((previous) => ({ ...previous, ...pendingJobs }));
      }

      return data;
    } catch (error) {
      console.error('Failed to fetch billing sync statuses:', error);
      return undefined;
    }
  }, []);

  // Initial read, so a page load shows the last run rather than three empty steps.
  useEffect((): (() => void) => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) void fetchStatuses();
    }, 0);
    return (): void => {
      active = false;
      clearTimeout(timer);
    };
  }, [fetchStatuses]);

  const pollActiveJobs = useCallback(
    async (currentActiveJobs: ActiveJobs): Promise<void> => {
      const data = await fetchStatuses();
      if (data === undefined) return;

      const remaining: ActiveJobs = { ...currentActiveJobs };
      let anyFinished = false;

      for (const task of BILLING_TASKS) {
        const job = data[task];
        if (
          currentActiveJobs[task] !== undefined &&
          job !== undefined &&
          job.status !== 'pending'
        ) {
          delete remaining[task];
          anyFinished = true;
        }
      }

      if (!anyFinished) return;

      setActiveJobs(remaining);
      setCancellingTasks({});
      // A finished job wrote to bill-participants; reload the table once, however many
      // of the three finished in this tick.
      await refineListData(query);
    },
    [fetchStatuses, query, refineListData],
  );

  // `pollActiveJobs` closes over the list query, which changes whenever the operator
  // filters or sorts. Reading it from a ref keeps that from restarting the interval.
  const pollReference = useRef(pollActiveJobs);
  useEffect((): void => {
    pollReference.current = pollActiveJobs;
  }, [pollActiveJobs]);

  const hasActiveJob = BILLING_TASKS.some((task) => activeJobs[task] !== undefined);

  useEffect((): (() => void) => {
    if (!hasActiveJob) return (): void => {};
    const interval = setInterval(() => {
      void pollReference.current(activeJobs);
    }, POLL_INTERVAL_MS);
    return (): void => {
      clearInterval(interval);
    };
  }, [activeJobs, hasActiveJob]);

  const startJob = useCallback(async (task: BillingTaskKey): Promise<void> => {
    setStartingTask(task);
    setActionError(undefined);

    try {
      const response = await fetch(`/api/confidential/billing/${task}`, { method: 'POST' });
      const result = (await response.json()) as {
        success: boolean;
        jobId?: string;
        error?: string;
      };

      if (result.success !== true || result.jobId === undefined) {
        setActionError(result.error ?? 'Trigger failed');
        return;
      }

      const jobId = result.jobId;
      setActiveJobs((previous) => ({ ...previous, [task]: jobId }));
      // Show the step as running immediately; the first poll is up to two seconds out.
      setJobs((previous) => ({
        ...previous,
        [task]: { id: jobId, status: 'pending', updatedAt: new Date().toISOString() },
      }));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setStartingTask(undefined);
    }
  }, []);

  const cancelJob = useCallback(async (task: BillingTaskKey): Promise<void> => {
    setCancellingTasks((previous) => ({ ...previous, [task]: true }));
    try {
      const response = await fetch('/api/confidential/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: TASK_SLUGS[task] }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        setActionError(result.error ?? 'Cancel failed');
        setCancellingTasks((previous) => ({ ...previous, [task]: false }));
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unknown error');
      setCancellingTasks((previous) => ({ ...previous, [task]: false }));
    }
  }, []);

  const regenerateAll = useCallback(async (): Promise<void> => {
    setIsRegenerating(true);
    setActionError(undefined);
    try {
      const response = await fetch('/api/confidential/billing/regenerate-all', { method: 'POST' });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (result.success !== true) {
        setActionError(result.error ?? 'Regenerate failed');
        return;
      }
      await refineListData(query);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsRegenerating(false);
    }
  }, [query, refineListData]);

  const isPending = {
    sync: startingTask === 'sync' || activeJobs.sync !== undefined,
    generate: startingTask === 'generate' || activeJobs.generate !== undefined,
    send: startingTask === 'send' || activeJobs.send !== undefined,
  };

  return {
    jobs,
    isPending,
    isCancelling: {
      sync: cancellingTasks.sync === true,
      generate: cancellingTasks.generate === true,
      send: cancellingTasks.send === true,
    },
    isBusy: isPending.sync || isPending.generate || isPending.send || isRegenerating,
    actionError,
    startJob,
    cancelJob,
    regenerateAll,
    isRegenerating,
    canRegenerateAll,
    availableDocuments,
  };
};
