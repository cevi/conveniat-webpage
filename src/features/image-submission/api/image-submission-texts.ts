import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { ImageSubmission } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { isBuildPhase } from '@/utils/build-phase';
import { withSpan } from '@/utils/tracing-helpers';
import config from '@payload-config';
import { cacheLife, cacheTag } from 'next/cache';
import { getPayload } from 'payload';

export interface TitledPoint {
  /** a value of `CONTENT_ICONS`, or empty for the row's default */
  icon: string;
  title: string;
  text: string;
}

/** The editors' texts of the image upload, with every missing value made empty. */
export interface ImageSubmissionTexts {
  introTitle: string;
  introText: string;
  introSteps: TitledPoint[];
  termsLead: string;
  termsSummary: TitledPoint[];
  termsFullText: string;
  photoTips: string[];
  successText: string;
}

const EMPTY_TEXTS: ImageSubmissionTexts = {
  introTitle: '',
  introText: '',
  introSteps: [],
  termsLead: '',
  termsSummary: [],
  termsFullText: '',
  photoTips: [],
  successText: '',
};

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const titledPoints = (rows: ImageSubmission['introSteps']): TitledPoint[] =>
  (rows ?? [])
    .map((row) => ({ icon: text(row.icon), title: text(row.title), text: text(row.text) }))
    .filter((row) => row.title !== '');

/** Drops what an editor left empty, so the page only asks whether a text is there. */
export const toImageSubmissionTexts = (global: Partial<ImageSubmission>): ImageSubmissionTexts => ({
  introTitle: text(global.introTitle),
  introText: text(global.introText),
  introSteps: titledPoints(global.introSteps),
  termsLead: text(global.termsLead),
  termsSummary: titledPoints(global.termsSummary),
  termsFullText: text(global.termsFullText),
  photoTips: (global.photoTips ?? []).map((row) => text(row.text)).filter((tip) => tip !== ''),
  successText: text(global.successText),
});

const readImageSubmissionTexts = async (locale: Locale): Promise<ImageSubmissionTexts> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'image-submission', 'global:image-submission');

  return await withSpan('getImageSubmissionTexts', async () => {
    const payload = await getPayload({ config });
    const global = await payload.findGlobal({
      slug: 'image-submission',
      locale,
      // the texts are written in German first; a missing translation shows the German one
      fallbackLocale: LOCALE.DE,
      depth: 0,
    });
    return toImageSubmissionTexts(global);
  });
};

/**
 * The texts of the image upload in one locale, cached across requests and expired by the
 * global's `afterChange` hook.
 */
export const getImageSubmissionTexts = async (locale: Locale): Promise<ImageSubmissionTexts> => {
  // during `next build` there is no database, and this must not reach the persistent cache
  if (isBuildPhase()) return EMPTY_TEXTS;
  return await readImageSubmissionTexts(locale);
};
