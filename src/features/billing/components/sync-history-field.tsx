'use client';

import { useField } from '@payloadcms/ui';
import React from 'react';

interface SyncHistoryEntry {
  date: string;
  action: string;
  diff?: Record<string, { from: string; to: string }>;
}

export const SyncHistoryField: React.FC<{ path: string }> = ({ path }) => {
  const { value } = useField<SyncHistoryEntry[]>({ path });

  if (!value || !Array.isArray(value) || value.length === 0) {
    return (
      <div className="field-type">
        <label className="field-label">Sync-Verlauf</label>
        <p className="text-gray-500">Kein Verlauf vorhanden.</p>
      </div>
    );
  }

  return (
    <div className="field-type">
      <label className="field-label mb-4 block">Sync-Verlauf</label>
      <div className="relative ml-3 space-y-6 border-l border-gray-200 dark:border-gray-700">
        {value.map((entry, index) => {
          const date = new Date(entry.date);
          const formattedDate = Number.isNaN(date.getTime())
            ? entry.date
            : date.toLocaleString('de-CH', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

          return (
            <div key={index} className="relative pl-6">
              {/* Timeline marker */}
              <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-gray-200 dark:border-gray-900 dark:bg-gray-700" />

              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                <span className="min-w-[140px] text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formattedDate}
                </span>
                <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {entry.action}
                </span>
              </div>
              {entry.diff && Object.keys(entry.diff).length > 0 && (
                <div className="mt-2 rounded bg-gray-50 p-2 text-xs text-gray-600 dark:bg-gray-800/50 dark:text-gray-400">
                  <ul className="list-inside list-disc">
                    {Object.entries(entry.diff).map(([key, change]) => (
                      <li key={key}>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{key}:</span>{' '}
                        <span className="line-through opacity-70">{change.from}</span> &rarr;{' '}
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {change.to}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SyncHistoryField;
