'use client';

import { SectionLabel } from '@/components/ui/section-label';
import { useRecentSearches } from '@/features/payload-cms/components/search/recent-searches';
import { filterChipClassName } from '@/features/payload-cms/components/search/search-filter-panel';
import { recentSearchesLabel } from '@/features/payload-cms/components/search/search-translations';
import type { Locale } from '@/types/types';
import { History } from 'lucide-react';
import type React from 'react';

/**
 * The searches of this device, as a way forward from an empty field or from no results, so the
 * search never ends in a blank state. Renders nothing before the first search.
 */
export const RecentSearches: React.FC<{
  locale: Locale;
  /** the query on screen, which is not offered again */
  current?: string;
  onPick: (query: string) => void;
  className?: string;
}> = ({ locale, current = '', onPick, className }) => {
  const recent = useRecentSearches().filter(
    (entry) => entry.toLowerCase() !== current.trim().toLowerCase(),
  );
  if (recent.length === 0) return;
  return (
    <div className={className}>
      <SectionLabel as="h3">{recentSearchesLabel[locale]}</SectionLabel>
      <div className="mt-2 flex flex-wrap gap-2">
        {recent.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => onPick(entry)}
            className={filterChipClassName(false)}
          >
            <History className="h-4 w-4 text-green-500" aria-hidden="true" />
            {entry}
          </button>
        ))}
      </div>
    </div>
  );
};
