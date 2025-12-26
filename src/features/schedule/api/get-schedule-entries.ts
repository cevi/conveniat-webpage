'use server';

import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import type { Locale } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { forceDynamicOnBuild } from '@/utils/is-pre-rendering';
import config from '@payload-config';
import { cacheLife, cacheTag } from 'next/cache';
import type { Where } from 'payload';
import { getPayload } from 'payload';

const getScheduleEntriesCached = async (
  where: Where = {},
  locale: Locale,
): Promise<CampScheduleEntryFrontendType[]> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'camp-schedule-entry');

  const payload = await getPayload({ config });

  const scheduleEntries = await payload.find({
    collection: 'camp-schedule-entry',
    locale: locale,
    // here we explicitly set the fallback locale to 'de' (German)
    fallbackLocale: 'de',
    depth: 1,
    where: where,
    // TODO: can we do that better?
    limit: 99_999, // Set a high limit to fetch all entries
  });

  // first sort by timeslot.date, then by timeslot.time (format "HH:mm - HH:mm")
  return scheduleEntries.docs.sort((a, b) => {
    const dateA = new Date(a.timeslot.date).getTime();
    const dateB = new Date(b.timeslot.date).getTime();
    if (dateA !== dateB) {
      return dateA - dateB; // Sort by date first
    }

    // If dates are equal, sort by time
    const timeA = a.timeslot.time.split(' - ')[0] ?? '00:00';
    const timeB = b.timeslot.time.split(' - ')[0] ?? '00:00';
    return timeA.localeCompare(timeB); // Sort by time
  });
};

export const getScheduleEntries = async (
  where: Where = {},
): Promise<CampScheduleEntryFrontendType[]> => {
  if (await forceDynamicOnBuild()) return [];

  const locale = await getLocaleFromCookies();
  return getScheduleEntriesCached(where, locale);
};
