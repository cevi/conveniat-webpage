'use client';

import { trpc } from '@/trpc/client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

export type ScheduleScope = 'mine' | 'all';

const storageKey = 'schedule-scope';

const subscribeToStorage = (onChange: () => void): (() => void) => {
  globalThis.addEventListener('storage', onChange);
  return (): void => globalThis.removeEventListener('storage', onChange);
};
const readStoredScope = (): string | null => globalThis.localStorage.getItem(storageKey);
// eslint-disable-next-line unicorn/no-null -- the server has no stored choice
const readNoScope = (): string | null => null;

interface ScheduleScopeState {
  /** the Quartiere of the user; empty for a guest and for somebody without a Hof */
  myQuartiere: { id: string; name: string }[];
  myQuartierIds: ReadonlySet<string>;
  /** `mine` narrows the programme to the user's Quartiere, `all` shows the whole camp */
  scope: ScheduleScope;
  setScope: (scope: ScheduleScope) => void;
}

/**
 * Whether the programme shows the user's own Quartier or the whole camp.
 *
 * It opens on the own Quartier, which is what a Hof needs to know. The choice lives in the URL
 * (`?scope=all`), next to the date, so it survives opening a block and coming back and a shared
 * link shows what the sender saw. The phone also remembers the last choice, for the next time
 * the programme opens without one.
 */
export const useScheduleScope = (): ScheduleScopeState => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParameters = useSearchParams();

  const { data } = trpc.schedule.getMyQuartiere.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });

  // the persisted query cache may hold anything an older version stored under this key
  const myQuartiere = useMemo(
    () =>
      (Array.isArray(data) ? data : []).filter(
        (quartier): quartier is { id: string; name: string } =>
          typeof quartier.id === 'string' && typeof quartier.name === 'string',
      ),
    [data],
  );
  const myQuartierIds = useMemo(() => new Set(myQuartiere.map(({ id }) => id)), [myQuartiere]);

  const storedScope = useSyncExternalStore(subscribeToStorage, readStoredScope, readNoScope);
  const chosenScope = searchParameters.get('scope') ?? storedScope;
  const scope: ScheduleScope = myQuartiere.length > 0 && chosenScope !== 'all' ? 'mine' : 'all';

  const setScope = useCallback(
    (next: ScheduleScope): void => {
      globalThis.localStorage.setItem(storageKey, next);
      const parameters = new URLSearchParams(searchParameters.toString());
      parameters.set('scope', next);
      router.replace(`${pathname}?${parameters.toString()}`);
    },
    [pathname, router, searchParameters],
  );

  return { myQuartiere, myQuartierIds, scope, setScope };
};
