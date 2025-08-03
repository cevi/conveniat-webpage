'use server';

import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import config from '@payload-config';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import type { Where } from 'payload';
import { getPayload } from 'payload';

export interface CampScheduleEntryFrontendType {
  id: string;
  title: string;
  description: SerializedEditorState;
  timeslots: {
    date: string;
    time: string;
    id?: string | null;
  }[];
  location: string | CampMapAnnotation;
  participants_min?: number | null;
  participants_max?: number | null;
  organiser?:
    | string
    | null
    | {
        fullName: string;
        email: string;
      };
}

export const getScheduleEntries = async (
  where: Where = {},
): Promise<CampScheduleEntryFrontendType[]> => {
  const payload = await getPayload({ config });
  const locale = await getLocaleFromCookies();

  const scheduleEntries = await payload.find({
    collection: 'camp-schedule-entry',
    locale: locale,
    depth: 1,
    where: where,
  });

  return scheduleEntries.docs;
};
