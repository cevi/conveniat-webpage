'use server';

import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import config from '@payload-config';
import type { Where } from 'payload';
import { getPayload } from 'payload';

export const getScheduleEntries = async (
  where: Where = {},
): Promise<CampScheduleEntryFrontendType[]> => {
  const payload = await getPayload({ config });
  const locale = await getLocaleFromCookies();

  const scheduleEntries = await payload.find({
    collection: 'camp-schedule-entry',
    locale: locale,
    // here we explicitly set the fallback locale to 'de' (German)
    fallbackLocale: 'de',
    depth: 1,
    where: where,
  });

  return scheduleEntries.docs;
};
