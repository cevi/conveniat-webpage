'use server';

import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import type { Locale } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { forceDynamicOnBuild } from '@/utils/is-pre-rendering';
import config from '@payload-config';
import { getPayload } from 'payload';

/* eslint-disable unicorn/no-null */
export const getById = async (
  id: string,
  locale?: Locale,
): Promise<CampScheduleEntryFrontendType | null> => {
  if (await forceDynamicOnBuild()) return null;

  const currentLocale = locale ?? (await getLocaleFromCookies());
  const payload = await getPayload({ config });

  try {
    const entry = await payload.findByID({
      collection: 'camp-schedule-entry',
      id,
      depth: 1,
      locale: currentLocale,
      fallbackLocale: 'de',
    });

    return entry as unknown as CampScheduleEntryFrontendType;
  } catch {
    return null;
  }
};
