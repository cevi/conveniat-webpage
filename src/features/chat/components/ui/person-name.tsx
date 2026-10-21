import { splitDisplayName } from '@/features/chat/utils/split-display-name';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/**
 * A person's name as every chat screen shows it: the Ceviname in bold first, the full name
 * after it in the secondary colour; without a Ceviname, the full name in bold. Takes the name
 * as the API formats it, "Vorname Nachname v/o Ceviname".
 *
 * `inline` puts both on one line that truncates, for rows; `stacked` puts the full name on a
 * line of its own, for a header or a card.
 */
export const PersonName: React.FC<{
  name: string;
  layout?: 'inline' | 'stacked';
  /** classes for the bold Ceviname, e.g. its size in a header */
  primaryClassName?: string | undefined;
  className?: string | undefined;
}> = ({ name, layout = 'inline', primaryClassName, className }) => {
  const { primary, secondary } = splitDisplayName(name);

  if (layout === 'stacked') {
    return (
      <span className={cn('flex flex-col', className)}>
        <span className={cn('font-semibold text-green-900', primaryClassName)}>{primary}</span>
        {secondary !== undefined && <span className="text-[13px] text-green-700">{secondary}</span>}
      </span>
    );
  }

  return (
    <span className={cn('block truncate text-green-900', className)}>
      <span className={cn('font-semibold', primaryClassName)}>{primary}</span>
      {secondary !== undefined && <span className="font-normal text-green-700"> {secondary}</span>}
    </span>
  );
};
