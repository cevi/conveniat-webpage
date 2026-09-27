'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { AlertTriangle, CheckCircle2, RefreshCw, Sparkles } from 'lucide-react';
import type React from 'react';

/** Where a Cevi.DB sync started from the admin panel stands. */
export type SyncPhase = 'running' | 'done' | 'error';

/** The phase a sync's card shows, from whether it still runs and whether it failed. */
export const syncPhaseOf = (isRunning: boolean, failed: boolean): SyncPhase => {
  if (isRunning) return 'running';
  return failed ? 'error' : 'done';
};

const newBadge: StaticTranslationString = { de: 'neu', en: 'new', fr: 'nouveau' };

/**
 * The status, progress bar and outcome of a sync that streams its progress, e.g. the events of
 * the Höfe or the camp functions. The result below the bar is the caller's.
 */
export const SyncProgressCard: React.FC<{
  phase: SyncPhase;
  status: string;
  /** 0 to 100 */
  percentage: number;
  /** e.g. "12/83 Untergruppen" */
  summary: string;
  ariaLabel: string;
  error?: string | undefined;
  children?: React.ReactNode;
}> = ({ phase, status, percentage, summary, ariaLabel, error, children }) => (
  <div className="rounded-md border border-(--theme-elevation-150) bg-(--theme-elevation-0) p-4">
    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-(--theme-elevation-800)">
      {phase === 'done' && <CheckCircle2 className="h-4 w-4 text-(--theme-success-500)" />}
      {phase === 'error' && <AlertTriangle className="h-4 w-4 text-(--theme-error-500)" />}
      {phase === 'running' && <RefreshCw className="h-4 w-4 animate-spin" />}
      <span>{status}</span>
    </div>

    <div
      className="h-2 w-full overflow-hidden rounded-full bg-(--theme-elevation-100)"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
      aria-label={ariaLabel}
    >
      <div
        className={
          phase === 'error'
            ? 'h-full rounded-full bg-(--theme-error-500) transition-[width] duration-300 ease-out'
            : 'h-full rounded-full bg-(--theme-success-500) transition-[width] duration-300 ease-out'
        }
        style={{ width: `${String(percentage)}%` }}
      />
    </div>

    <div className="mt-2 flex items-center justify-between text-xs text-(--theme-elevation-600)">
      <span>{summary}</span>
      <span className="font-mono">{String(percentage)}%</span>
    </div>

    {phase === 'error' && error !== undefined && (
      <p className="mt-3 mb-0 text-[13px] text-(--theme-error-600)">{error}</p>
    )}
    {children}
  </div>
);

/** One thing a sync found, e.g. an event of a Hof or a group with leaders. */
export interface SyncFoundItem {
  key: string;
  label: string;
  /** shown on the right, e.g. "Gruppe 4742" or "2 Leitende" */
  meta: string;
  isNew?: boolean;
}

/** What a sync has found so far, newest first so the latest stays in view while it runs. */
export const SyncFoundList: React.FC<{
  heading: string;
  emptyText: string;
  items: SyncFoundItem[];
  locale: Locale;
}> = ({ heading, emptyText, items, locale }) => (
  <div className="rounded-md border border-(--theme-elevation-150) bg-(--theme-elevation-0) p-4">
    <div className="mb-2 flex items-baseline justify-between text-sm font-medium text-(--theme-elevation-800)">
      <span>{heading}</span>
      <span className="font-mono text-xs text-(--theme-elevation-600)">{String(items.length)}</span>
    </div>

    {items.length === 0 ? (
      <p className="m-0 text-[13px] text-(--theme-elevation-500)">{emptyText}</p>
    ) : (
      <ul className="m-0 max-h-56 list-none overflow-y-auto p-0">
        {[...items].reverse().map((item) => (
          <li
            key={item.key}
            className="flex items-center justify-between gap-2 border-b border-(--theme-elevation-100) py-1.5 last:border-b-0"
          >
            <span className="truncate text-[13px] text-(--theme-elevation-800)" title={item.label}>
              {item.label}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {item.isNew === true && (
                <span className="inline-flex items-center gap-1 rounded-full bg-(--theme-success-100) px-2 py-0.5 text-[11px] font-medium text-(--theme-success-600)">
                  <Sparkles className="h-3 w-3" />
                  {newBadge[locale]}
                </span>
              )}
              <span className="font-mono text-[11px] text-(--theme-elevation-500)">
                {item.meta}
              </span>
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);
