'use client';

import { useLayoutEffect, useState } from 'react';

/**
 * The query of a search that is empty again whenever the user comes back to the screen, as in
 * other chat apps: a chat found and opened should not leave the list filtered behind it.
 *
 * Next.js keeps a route the user left mounted, hidden in an `<Activity>`, so plain state would
 * survive the visit. Hiding runs the layout effect's cleanup, before the screen can show again.
 */
export const useSearchClearedOnLeave = (): [string, (query: string) => void] => {
  const [query, setQuery] = useState('');
  useLayoutEffect(() => (): void => setQuery(''), []);
  return [query, setQuery];
};
