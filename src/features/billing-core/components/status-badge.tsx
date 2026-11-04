'use client';

import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/**
 * The colours a status badge comes in. The camp bills and the Besuchstag bills pick theirs from
 * this one set, so the same state reads the same in both lists: paid is emerald, a cancelled or
 * failed one red.
 */
export type StatusBadgeTone =
  | 'blue'
  | 'yellow'
  | 'red'
  | 'fuchsia'
  | 'orange'
  | 'sky'
  | 'green'
  | 'violet'
  | 'amber'
  | 'cyan'
  | 'emerald'
  | 'none';

const toneClasses: Record<StatusBadgeTone, string> = {
  blue: 'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  yellow:
    'border-yellow-200 bg-yellow-100 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
  red: 'border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-200',
  fuchsia:
    'border-fuchsia-200 bg-fuchsia-100 text-fuchsia-800 dark:border-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200',
  orange:
    'border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  sky: 'border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  green:
    'border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/40 dark:text-green-200',
  violet:
    'border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  amber:
    'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  cyan: 'border-cyan-200 bg-cyan-100 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',
  emerald:
    'border-emerald-300 bg-emerald-200 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-800/50 dark:text-emerald-100',
  none: 'border-gray-200 bg-transparent text-gray-400 dark:border-gray-700 dark:text-gray-500',
};

/**
 * A status in a list cell, as a small coloured badge. Passes everything else on to its span, so
 * it can be the trigger of a tooltip.
 */
export const StatusBadge: React.FC<React.ComponentProps<'span'> & { tone: StatusBadgeTone }> = ({
  tone,
  className,
  ...rest
}) => (
  <span
    className={cn(
      'inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
      toneClasses[tone],
      className,
    )}
    {...rest}
  />
);
