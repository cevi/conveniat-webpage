import { formatDayLabel } from '@/features/chat/utils/message-grouping';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/**
 * The day above its messages. A band in the list colour, not a lone pill: messages scroll out of
 * sight under it instead of showing their text on both sides of the day.
 */
export const DayLabel: React.FC<{ date: Date; locale: Locale; isThread?: boolean }> = ({
  date,
  locale,
  isThread = false,
}) => (
  <div
    className={cn(
      'bg-page pointer-events-none sticky top-0 z-20 -mx-2 flex justify-center',
      isThread ? 'py-2' : 'py-3',
    )}
  >
    {/* the browser's clock decides "today", which the server rendering a preview does not share */}
    <h3
      suppressHydrationWarning
      className="border-line rounded-full border bg-white px-3 py-1 text-[13px] font-semibold text-green-900"
    >
      {formatDayLabel(date, locale)}
    </h3>
  </div>
);
