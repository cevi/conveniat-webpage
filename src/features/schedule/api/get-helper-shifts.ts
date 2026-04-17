'use server';

import type { Locale } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { forceDynamicOnBuild } from '@/utils/is-pre-rendering';
import config from '@payload-config';
import { cacheLife, cacheTag } from 'next/cache';
import type { Where } from 'payload';
import { getPayload } from 'payload';

export interface HelperShiftFrontendType {
  id: string;
  title: string;
  description: string;
  meetingPoint?: string | undefined; // eslint-disable-line unicorn/no-null
  timeslot: {
    date: string;
    time: string;
  };
  location?: unknown;
  participants_max?: number | undefined;
  enable_enrolment?: boolean | undefined;
  hide_participant_list?: boolean | undefined;
  mainContent?: unknown;
}

const getHelperShiftsCached = async (
  where: Where = {},
  locale: Locale,
): Promise<HelperShiftFrontendType[]> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'helper-shifts');

  const payload = await getPayload({ config });

  const shifts = await payload.find({
    collection: 'helper-shifts',
    locale: locale,
    fallbackLocale: 'de',
    depth: 1,
    where: where,
    limit: 99_999,
  });

  return shifts.docs
    .map((document_) => ({
      id: String(document_.id),
      title: String(document_.title),
      description: typeof document_.description === 'string' ? document_.description : '',
      meetingPoint:
        document_.meetingPoint != undefined && typeof document_.meetingPoint === 'string'
          ? document_.meetingPoint
          : undefined, // eslint-disable-line unicorn/no-null
      timeslot: {
        date: String(document_.timeslot.date),
        time: String(document_.timeslot.time),
      },
      location: document_.location,
      participants_max:
        typeof document_.participants_max === 'number' ? document_.participants_max : undefined,
      enable_enrolment:
        typeof document_.enable_enrolment === 'boolean' ? document_.enable_enrolment : undefined,
      hide_participant_list:
        typeof document_.hide_participant_list === 'boolean'
          ? document_.hide_participant_list
          : undefined,
      mainContent: document_.mainContent,
    }))
    .sort((a, b) => {
      const dateA = new Date(a.timeslot.date).getTime();
      const dateB = new Date(b.timeslot.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      const timeA = a.timeslot.time.split(' - ')[0] ?? '00:00';
      const timeB = b.timeslot.time.split(' - ')[0] ?? '00:00';
      return timeA.localeCompare(timeB);
    });
};

export const getHelperShifts = async (
  where: Where = {},
  locale?: Locale,
): Promise<HelperShiftFrontendType[]> => {
  if (await forceDynamicOnBuild()) return [];

  const currentLocale = locale ?? (await getLocaleFromCookies());
  return getHelperShiftsCached(where, currentLocale);
};
