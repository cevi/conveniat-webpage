'use client';

import type {
  SyncHistoryEntry,
  SyncHistoryRunSection,
} from '@/features/billing/services/sync-history-summary';
import { summarizeSyncHistory } from '@/features/billing/services/sync-history-summary';
import { useField } from '@payloadcms/ui';
import React, { useMemo, useState } from 'react';

/**
 * German labels for the actions the billing services write. An action without an entry —
 * `bill_sent_to_<address>` carries the address, and older rows carry actions we have since
 * renamed — is shown as it was stored.
 */
const ACTION_LABELS: Record<string, string> = {
  first_sync: 'Erstmals abgeglichen',
  re_added_detected: 'Wieder angemeldet',
  participant_updated: 'Angaben aktualisiert',
  sync_confirmed: 'Abgleich bestätigt',
  manual_review_required: 'Manuelle Prüfung nötig',
  removed_detected: 'In der Cevi.DB entfernt',
  anmeldestatus_written_to_cevidb: 'Anmeldestatus in der Cevi.DB gesetzt',
  anmeldestatus_writeback_failed: 'Anmeldestatus konnte in der Cevi.DB nicht gesetzt werden',
};

const actionLabel = (action: string): string => {
  const known = ACTION_LABELS[action];
  if (known !== undefined) return known;
  return action.startsWith('bill_sent_to_')
    ? `Rechnung versendet an ${action.slice('bill_sent_to_'.length)}`
    : action;
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('de-CH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
};

const EntryRow: React.FC<{ entry: SyncHistoryEntry }> = ({ entry }) => (
  <div className="relative pl-6">
    {/* Timeline marker */}
    <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-gray-200 dark:border-gray-900 dark:bg-gray-700" />

    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
      <span className="min-w-[140px] text-sm font-medium text-gray-900 dark:text-gray-100">
        {formatDate(entry.date)}
      </span>
      <span className="rounded bg-gray-100 px-2 py-0.5 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        {actionLabel(entry.action)}
        {entry.value !== undefined && entry.value !== '' && <>: «{entry.value}»</>}
      </span>
    </div>
    {entry.reviewReason !== undefined && entry.reviewReason !== '' && (
      <p className="mt-2 rounded border border-fuchsia-200 bg-fuchsia-50 p-2 text-xs text-fuchsia-900 dark:border-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-100">
        {entry.reviewReason}
      </p>
    )}
    {entry.diff && Object.keys(entry.diff).length > 0 && (
      <div className="mt-2 rounded bg-gray-50 p-2 text-xs text-gray-600 dark:bg-gray-800/50 dark:text-gray-400">
        <ul className="list-inside list-disc">
          {Object.entries(entry.diff).map(([key, change]) => (
            <li key={key}>
              <span className="font-medium text-gray-700 dark:text-gray-300">{key}:</span>{' '}
              <span className="line-through opacity-70">{change.from}</span> &rarr;{' '}
              <span className="font-semibold text-green-600 dark:text-green-400">{change.to}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

/**
 * One line for a stretch of syncs that changed nothing worth reading, with the detail a
 * click away. A camp-long history is thousands of these; the few entries that say what
 * happened to this participation are what the operator came for.
 */
const RunRow: React.FC<{ run: SyncHistoryRunSection }> = ({ run }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const first = run.entries[0];
  const last = run.entries.at(-1);

  return (
    <div className="relative pl-6">
      {/* Timeline marker: hollow, because nothing happened here */}
      <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900" />

      <div className="rounded border border-dashed border-gray-200 p-2 dark:border-gray-700">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
          <span className="min-w-[140px] text-sm font-medium text-gray-500 dark:text-gray-400">
            {first === undefined ? '' : formatDate(first.date)}
            {last !== undefined && last !== first && <> &ndash; {formatDate(last.date)}</>}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {run.entries.length} Abgleiche ohne inhaltliche Änderung
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1 text-xs text-gray-500 dark:text-gray-400">
          {run.actionCounts.map(({ action, count }) => (
            <span
              key={action}
              className="rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-800 dark:text-gray-400"
            >
              {actionLabel(action)} &times;{count}
            </span>
          ))}
        </div>

        {run.changedFields.length > 0 && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Nur abgeleitete Felder wechselten: {run.changedFields.join(', ')}
          </p>
        )}

        <button
          type="button"
          onClick={(): void => setIsExpanded((previous) => !previous)}
          className="mt-2 text-xs font-medium text-blue-600 underline dark:text-blue-400"
        >
          {isExpanded ? 'Einträge ausblenden' : `Alle ${run.entries.length} Einträge anzeigen`}
        </button>

        {isExpanded && (
          <div className="mt-3 space-y-4 border-l border-gray-200 pl-3 dark:border-gray-700">
            {run.entries.map((entry, index) => (
              <EntryRow key={index} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const SyncHistoryField: React.FC<{ path: string }> = ({ path }) => {
  const { value } = useField<SyncHistoryEntry[]>({ path });

  const entries = useMemo(
    // A row written by an older build, or a draft, can carry anything at all.
    () => (Array.isArray(value) ? value : []),
    [value],
  );
  const sections = useMemo(() => summarizeSyncHistory(entries), [entries]);

  if (entries.length === 0) {
    return (
      <div className="field-type">
        <label className="field-label">Sync-Verlauf</label>
        <p className="text-gray-500">Kein Verlauf vorhanden.</p>
      </div>
    );
  }

  return (
    <div className="field-type">
      <label className="field-label mb-1 block">Sync-Verlauf</label>
      {sections.length < entries.length && (
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          {entries.length} Einträge, zusammengefasst auf {sections.length} Zeilen.
        </p>
      )}
      <div className="relative ml-3 space-y-6 border-l border-gray-200 dark:border-gray-700">
        {sections.map((section, index) =>
          section.kind === 'entry' ? (
            <EntryRow key={index} entry={section.entry} />
          ) : (
            <RunRow key={index} run={section} />
          ),
        )}
      </div>
    </div>
  );
};

export default SyncHistoryField;
