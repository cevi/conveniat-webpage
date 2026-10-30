'use client';

import type { Collection, UtilsRecord } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';
import { useSyncExternalStore } from 'react';

const unsubscribeFromNothing = (): void => {};
const subscribeToNothing = (): (() => void) => unsubscribeFromNothing;
const isInBrowser = (): boolean => true;
const isOnServer = (): boolean => false;

/**
 * The schema bound `Collection` itself declares. `StandardSchemaAlias` is narrower: it requires
 * `'~standard'.types`, which Zod 4 types as optional, so a Zod-backed collection would not fit.
 */
type CollectionSchema = NonNullable<Collection['config']['schema']>;

/**
 * The rows of a collection kept in `localStorage`, live: none on the server and while the page
 * hydrates, the stored ones from the render right after.
 *
 * `useLiveQuery` hands React the browser's rows as its server snapshot too, so hydration saw
 * the rows of the last visit where the server had rendered none, failed, and React rendered the
 * whole page again. The server cannot read `localStorage`, so it is the browser that has to wait.
 */
export const useStoredRows = <
  T extends object,
  TKey extends string | number,
  TUtils extends UtilsRecord,
  TSchema extends CollectionSchema,
  TInsertInput extends object,
>(
  collection: Collection<T, TKey, TUtils, TSchema, TInsertInput>,
): T[] => {
  const { data } = useLiveQuery({ query: (q) => q.from({ row: collection }) });
  const isHydrated = useSyncExternalStore(subscribeToNothing, isInBrowser, isOnServer);
  return isHydrated ? data : [];
};
