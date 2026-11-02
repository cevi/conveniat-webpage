'use client';

import { usePreference } from '@/hooks/use-preference';
import { readPreference, writePreference } from '@/lib/preferences';

const MAX_RECENT_SEARCHES = 6;

/** The last queries searched on this device, newest first. */
export const useRecentSearches = (): string[] => usePreference('recent-searches');

/** Remembers a query the visitor acted on, so an empty search field can offer it again. */
export const rememberSearch = (query: string): void => {
  const trimmed = query.trim();
  if (trimmed.length < 2) return;
  const others = readPreference('recent-searches').filter(
    (entry) => entry.toLowerCase() !== trimmed.toLowerCase(),
  );
  writePreference('recent-searches', [trimmed, ...others].slice(0, MAX_RECENT_SEARCHES));
};
