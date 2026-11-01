'use client';

import { useLayoutEffect, useState } from 'react';

/**
 * The map's search term, which ends when the page is left.
 *
 * With `cacheComponents`, Next.js does not unmount a page the user leaves but hides it in an
 * `<Activity>` and shows it again, state and all, on the next visit. A search kept that way
 * still filtered the map when the user came back through "Show on the map", and hid the very
 * place the link was meant to show. Hiding runs the layout effect's cleanup, so the search is
 * gone before the page is visible again.
 */
export const useMapSearchTerm = (): [string, (term: string) => void] => {
  const [searchTerm, setSearchTerm] = useState('');
  useLayoutEffect(() => (): void => setSearchTerm(''), []);
  return [searchTerm, setSearchTerm];
};
