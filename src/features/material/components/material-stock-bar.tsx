import { format, labels } from '@/features/material/components/material-labels';
import type { StockSummary } from '@/features/material/utils/stock';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/**
 * The colour of each part of an article's stock, the same in the bar, its legend and the
 * figures above it, so a colour means one thing everywhere. Soft on purpose: the numbers carry
 * the message, the colours only tell the parts apart. Only colours from the app's palette
 * exist, see `tailwind.config.ts`.
 */
export const stockTone = {
  free: 'bg-conveniat-green',
  reserved: 'bg-blue-300',
  issued: 'bg-amber-400',
  broken: 'bg-red-400',
} as const;

interface Segment {
  key: keyof typeof stockTone;
  value: number;
  label: string;
}

/**
 * One bar for the whole stock of an article: free, reserved, out, and broken, so the
 * depot can read at a glance where the pieces are. The free count leads, the other parts
 * follow in grey behind a dot of their colour.
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
  /**
   * whether the legend names the parts besides the free ones; a participant only needs what
   * is free, the bar still shows the rest
   */
  breakdown?: boolean;
}> = ({
  stock,
  totalQuantity,
  unavailable,
  unit,
  locale,
  size = 'sm',
  maxPerLoan,
  breakdown = true,
}) => {
  const segments: Segment[] = [
    { key: 'free', value: stock.available, label: labels.free[locale] },
    { key: 'reserved', value: stock.reserved, label: labels.reservedShort[locale] },
    { key: 'issued', value: stock.issued, label: labels.issuedShort[locale] },
    { key: 'broken', value: unavailable, label: labels.damagedShort[locale] },
  ];
  const denominator = Math.max(totalQuantity, 1);
  const [free, ...others] = segments;

  return (
    <div className="w-full min-w-0">
      <div
        className={cn(
          'flex w-full gap-px overflow-hidden rounded-full bg-gray-100',
          size === 'lg' ? 'h-2' : 'h-1',
        )}
        role="img"
        aria-label={segments.map((segment) => `${segment.value} ${segment.label}`).join(', ')}
      >
        {segments.map((segment) =>
          segment.value > 0 ? (
            <div
              key={segment.key}
              className={stockTone[segment.key]}
              style={{ width: `${(segment.value / denominator) * 100}%` }}
            />
          ) : undefined,
        )}
      </div>
      <div
        className={cn(
          'mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-gray-500 tabular-nums',
          size === 'lg' ? 'text-sm' : 'text-xs',
        )}
      >
        {free !== undefined && (
          <span>
            <span className="font-semibold text-gray-900">
              {free.value} {free.label}
            </span>{' '}
            {format(labels.ofTotal, locale, { n: totalQuantity, unit })}
          </span>
        )}
        {others.map((segment) =>
          breakdown && segment.value > 0 ? (
            <span key={segment.key} className="inline-flex items-center gap-1">
              <span className={cn('size-1.5 rounded-full', stockTone[segment.key])} aria-hidden />
              {segment.value} {segment.label}
            </span>
          ) : undefined,
        )}
        {maxPerLoan !== undefined && (
          <span title={labels.maxPerLoan[locale]}>
            {format(labels.maxShort, locale, { n: maxPerLoan })}
          </span>
        )}
      </div>
    </div>
  );
};
