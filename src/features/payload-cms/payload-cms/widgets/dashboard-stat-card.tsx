import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

export interface DashboardStat {
  value: number;
  /** Names the figure. Needed as soon as a card shows more than one. */
  label?: string;
  /** Draws the figure in the error colour, for a count that should be zero. */
  isAlert?: boolean;
}

interface DashboardStatCardProperties {
  title: string;
  stats: DashboardStat[];
  /** Tints the whole card, for something that needs attention now. */
  isAlert?: boolean;
  footer?: React.ReactNode;
}

/**
 * A figure on the admin dashboard. Every statistics widget renders through it, so the cards in a
 * row share one anatomy and one height.
 */
export const DashboardStatCard: React.FC<DashboardStatCardProperties> = ({
  title,
  stats,
  isAlert = false,
  footer,
}) => (
  // Payload stretches a widget to the height of its row, but its `.card` only grows with its
  // content and aligns itself to the top, so the card has to claim that height itself.
  <div
    className={cn('card h-full flex-col justify-start gap-3', {
      'border-(--theme-error-300) bg-(--theme-error-100)': isAlert,
    })}
  >
    <h3 className="m-0 text-base font-medium text-(--theme-elevation-600)">{title}</h3>
    <div className="flex flex-wrap gap-x-8 gap-y-3">
      {stats.map((stat, index) => (
        <div key={stat.label ?? index} className="flex flex-col gap-1">
          <p
            className={cn('m-0 text-4xl leading-none font-bold tabular-nums', {
              'text-(--theme-error-600)': stat.isAlert,
            })}
          >
            {stat.value}
          </p>
          {stat.label !== undefined && (
            <p className="m-0 text-sm text-(--theme-elevation-500)">{stat.label}</p>
          )}
        </div>
      ))}
    </div>
    {footer !== undefined && <div className="mt-auto">{footer}</div>}
  </div>
);
