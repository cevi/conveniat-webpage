import { format, labels } from '@/features/material/components/material-labels';
import type { StockSummary } from '@/features/material/utils/stock';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

interface Segment {
  key: string;
  value: number;
  bar: string;
  text: string;
  label: string;
}

/**
 * One bar for the whole stock of an article: free, reserved, out, and broken, so the
 * depot can read at a glance where the pieces are.
 */
export const MaterialStockBar: React.FC<{
  stock: StockSummary;
  totalQuantity: number;
  unavailable: number;
  unit: string;
  locale: Locale;
  size?: 'sm' | 'lg';
  /** the most one loan may take, shown after the total when given */
  maxPerLoan?: number;
}> = ({ stock, totalQuantity, unavailable, unit, locale, size = 'sm', maxPerLoan }) => {
  const segments: Segment[] = [
    {
      key: 'free',
      value: stock.available,
      bar: 'bg-green-600',
      text: 'text-green-700',
      label: labels.free[locale],
    },
    {
      key: 'reserved',
      value: stock.reserved,
      bar: 'bg-blue-600',
      text: 'text-blue-700',
      label: labels.reservedShort[locale],
    },
    {
      key: 'issued',
      value: stock.issued,
      bar: 'bg-orange-500',
      text: 'text-orange-700',
      label: labels.issuedShort[locale],
    },
    {
      key: 'broken',
      value: unavailable,
      bar: 'bg-red-600',
      text: 'text-red-700',
      label: labels.damagedShort[locale],
    },
  ];
  const denominator = Math.max(totalQuantity, 1);

  return (
    <div className="w-full min-w-0">
      <div
        className={cn(
          'flex w-full overflow-hidden rounded-full bg-gray-100',
          size === 'lg' ? 'h-3' : 'h-1.5',
        )}
        role="img"
        aria-label={segments.map((segment) => `${segment.value} ${segment.label}`).join(', ')}
      >
        {segments.map((segment) =>
          segment.value > 0 ? (
            <div
              key={segment.key}
              className={segment.bar}
              style={{ width: `${(segment.value / denominator) * 100}%` }}
            />
          ) : undefined,
        )}
      </div>
      <div
        className={cn(
          'mt-1 flex flex-wrap gap-x-3 font-mono',
          size === 'lg' ? 'text-sm' : 'text-[11px]',
        )}
      >
        {segments.map((segment) =>
          segment.value > 0 || segment.key === 'free' ? (
            <span key={segment.key} className={segment.text}>
              {segment.value} {segment.label}
            </span>
          ) : undefined,
        )}
        <span className="text-gray-400">
          /{totalQuantity} {unit}
        </span>
        {maxPerLoan !== undefined && (
          <span className="text-gray-500" title={labels.maxPerLoan[locale]}>
            {format(labels.maxShort, locale, { n: maxPerLoan })}
          </span>
        )}
      </div>
    </div>
  );
};
