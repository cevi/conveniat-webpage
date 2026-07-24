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

/**
 * Lightweight schedule entries fetch for the dashboard.
 *
 * Uses `select` to skip heavy fields not needed by the dashboard:
 * - `organiser` (relationship → users): saves ~21ms by skipping user population
 * - `description` (richText): large payload, not rendered on dashboard cards
 * - `target_group` (richText): not rendered on dashboard cards
 *
 * Still populates `location` and `category` at depth: 1 since the dashboard
 * needs `location.title` and `category.title`/`category.colorTheme`.
 */
const getScheduleEntriesForDashboardCached = async (
  locale: Locale,
): Promise<CampScheduleEntryFrontendType[]> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'camp-schedule-entry');

  const payload = await getPayload({ config });

  const scheduleEntries = await payload.find({
    collection: 'camp-schedule-entry',
    locale: locale,
    fallbackLocale: 'de',
    depth: 1,
    limit: 99_999,
    select: {
      title: true,
      timeslot: true,
      location: true,
      category: true,
      enable_enrolment: true,
      participants_min: true,
      participants_max: true,
      // Intentionally omitted: organiser, description, target_group
    },
  });

  return scheduleEntries.docs.sort((a, b) => {
    const dateA = new Date(a.timeslot.date).getTime();
    const dateB = new Date(b.timeslot.date).getTime();
    if (dateA !== dateB) {
      return dateA - dateB;
    }

    const timeA = a.timeslot.time.split(' - ')[0] ?? '00:00';
    const timeB = b.timeslot.time.split(' - ')[0] ?? '00:00';
    return timeA.localeCompare(timeB);
  }) as unknown as CampScheduleEntryFrontendType[];
};

export const getScheduleEntries = async (
  where: Where = {},
  locale?: Locale,
): Promise<CampScheduleEntryFrontendType[]> => {
  if (await forceDynamicOnBuild()) return [];

  const currentLocale = locale ?? (await getLocaleFromCookies());
  return getScheduleEntriesCached(where, currentLocale);
};

/**
 * Dashboard-optimized variant that skips expensive relationship populations
 * (organiser → users) and heavy richText fields (description, target_group).
 */
export const getScheduleEntriesForDashboard = async (
  locale?: Locale,
): Promise<CampScheduleEntryFrontendType[]> => {
  if (await forceDynamicOnBuild()) return [];

  const currentLocale = locale ?? (await getLocaleFromCookies());
  return getScheduleEntriesForDashboardCached(currentLocale);
};
