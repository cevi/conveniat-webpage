import prisma from '@/lib/db/prisma';
import { CourseType } from '@/lib/prisma/enums';
import type { DefaultServerCellComponentProps } from 'payload';
import type React from 'react';

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
 * List column of helper-shifts and camp-schedule-entry: how many are enrolled against the maximum.
 *
 * A server component that counts for its own row, so the number does not depend on how the list
 * was opened. It used to come from an afterRead hook that only counted when the request's referer
 * pointed into the admin panel, and a list opened from a bookmark, a link or a fresh tab showed
 * 0 for every entry.
 */
export const FilledStatusCell = async ({
  rowData,
  field,
  collectionConfig,
}: DefaultServerCellComponentProps): Promise<React.ReactElement> => {
  // Payload also renders a ui field's Cell while building the edit view's form state, where there
  // is no row: its skip list is checked with `key in [...]`, which tests array indices, not names.
  const row = rowData as DefaultServerCellComponentProps['rowData'] | undefined;
  const documentId: unknown = row?.['id'];
  if (typeof documentId !== 'string') return <></>;

  const courseType =
    collectionConfig.slug === 'helper-shifts' ? CourseType.SHIFT : CourseType.PROGRAM;
  const enrolled = await prisma.enrollment.count({ where: { courseId: documentId, courseType } });

  const maxValue: unknown = row?.['participants_max'];
  const max = typeof maxValue === 'number' ? maxValue : undefined;
  const type: 'open' | 'full' = max == undefined || enrolled < max ? 'open' : 'full';
  const invertColors =
    (field.admin as { custom?: { invertColors?: boolean } } | undefined)?.custom?.invertColors ===
    true;

  return (
    <div className="flex items-center gap-1">
      <FilledBadge type={type} enrolled={enrolled} max={max} invertColors={invertColors} />
    </div>
  );
};

export default FilledStatusCell;
