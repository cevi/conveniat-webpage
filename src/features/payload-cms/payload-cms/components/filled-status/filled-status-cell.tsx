'use client';

import React from 'react';

/**
 * Reusable badge component matching the SMTP / Brevo style badges used
 * throughout the Payload CMS admin panel.
 */
const FilledBadge: React.FC<{
  type: 'open' | 'full' | 'unknown';
  enrolled: number;
  max?: number | undefined;
  invertColors?: boolean;
}> = ({ type, enrolled, max, invertColors }) => {
  const baseClasses =
    'flex items-center justify-center rounded border px-1.5 py-0.5 text-xs font-medium';

  let colorClasses =
    'border-gray-200 bg-transparent text-gray-400 dark:border-gray-700 dark:text-gray-500';
  let symbol = '–';

  switch (type) {
    case 'open': {
      if (invertColors) {
        colorClasses =
          'border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-200';
        symbol = '✗';
      } else {
        colorClasses =
          'border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/40 dark:text-green-200';
        symbol = '✓';
      }
      break;
    }
    case 'full': {
      if (invertColors) {
        colorClasses =
          'border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/40 dark:text-green-200';
        symbol = '✓';
      } else {
        colorClasses =
          'border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-200';
        symbol = '✗';
      }
      break;
    }
    default: {
      break;
    }
  }

  const label = max == undefined ? String(enrolled) : `${String(enrolled)}/${String(max)}`;

  return (
    <span className={`${baseClasses} ${colorClasses}`} title={`${label} enrolled`}>
      {symbol} {label}
    </span>
  );
};

/**
 * Custom list-view cell for helper-shifts and camp-schedule-entry.
 * Displays a capacity badge showing how many spots are filled vs. the maximum.
 *
 * This component is loaded client-side via Payload's `admin.components.Cell`
 * config, and receives the row data via the `rowData` prop.
 */
export const FilledStatusCell: React.FC<{
  cellData?: unknown;
  rowData?: { id?: string; participants_max?: number | undefined; enrolledCount?: number } & Record<
    string,
    unknown
  >;
  field?: { admin?: { custom?: { invertColors?: boolean } } };
}> = ({ rowData, field }) => {
  // These values are injected by the FilledStatusField virtual field hook
  const max = rowData?.participants_max ?? undefined;
  const enrolled = typeof rowData?.enrolledCount === 'number' ? rowData.enrolledCount : 0;

  let type: 'open' | 'full' | 'unknown' = 'unknown';

  if (max == undefined) {
    // No capacity limit — always open
    type = 'open';
  } else if (enrolled >= max) {
    type = 'full';
  } else {
    type = 'open';
  }

  const invertColors = field?.admin?.custom?.invertColors === true;

  return (
    <div className="flex items-center gap-1">
      <FilledBadge type={type} enrolled={enrolled} max={max} invertColors={invertColors} />
    </div>
  );
};

export default FilledStatusCell;
