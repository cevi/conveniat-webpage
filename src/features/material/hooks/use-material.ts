'use client';

import { shouldRetryMaterialQuery } from '@/features/material/utils/query-errors';
import type { RouterOutputs } from '@/trpc/client';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useCallback, useEffect, useState } from 'react';

export type MaterialItem = RouterOutputs['material']['getItemList'][number];
export type MaterialItemDetail = RouterOutputs['material']['getItem'];
export type MaterialLoan = RouterOutputs['material']['getLoanList'][number];
export type MaterialHof = RouterOutputs['material']['getHofList'][number];
export type MaterialTeamDashboard = RouterOutputs['material']['getTeamDashboard'];
export type MaterialMe = RouterOutputs['material']['getMe'];

/**
 * The Höfe the reader belongs to. A `getMe` restored from the cache of an app version before
 * the Höfe has `departments` instead, so the field may be missing.
 */
export const getMyHoefe = (me: { hoefe?: MaterialMe['hoefe'] } | undefined): MaterialMe['hoefe'] =>
  me?.hoefe ?? [];

/**
 * Options every material query shares. The app-wide client neither refetches on mount nor
 * forgets for 72 hours, which suits content but not stock: a depot view has to ask again
 * every time it opens. A 4xx is not retried, so "not signed in" shows at once.
 */
export const materialQueryOptions = {
  refetchOnMount: true,
  retry: shouldRetryMaterialQuery,
} as const;

/** For the lists the depot keeps open on a desk: they follow the counter on their own. */
export const MATERIAL_POLL_INTERVAL_MS = 30_000;

export const useMaterialLocale = (): Locale => useCurrentLocale(i18nConfig) as Locale;

/**
 * Every write changes stock, loans and the dashboards at once, so after one the whole
 * material router is refetched rather than guessing which queries it touched.
 */
export const useInvalidateMaterial = (): (() => Promise<void>) => {
  const utils = trpc.useUtils();
  return useCallback(async () => {
    await utils.material.invalidate();
  }, [utils]);
};

const NOW_TICK_MS = 60_000;

/**
 * The current minute, which decides what reads as due or overdue. Held in state so every
 * row of one render agrees, and ticked once a minute so a view left open on the depot desk
 * moves a loan to overdue at midnight without a reload.
 */
export const useNow = (): Date => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), NOW_TICK_MS);
    return (): void => clearInterval(timer);
  }, []);
  return now;
};
