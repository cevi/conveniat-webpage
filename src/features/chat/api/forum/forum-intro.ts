import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { ForumIntro } from '@/features/payload-cms/payload-types';
import { trpcBaseProcedure } from '@/trpc/init';
import type { Locale } from '@/types/types';
import { isBuildPhase } from '@/utils/build-phase';
import { withSpan } from '@/utils/tracing-helpers';
import config from '@payload-config';
import { cacheLife, cacheTag } from 'next/cache';
import { getPayload } from 'payload';
import { z } from 'zod';

/** A point of the intro: an icon from `CONTENT_ICONS` or empty, a title and a line. */
export interface ForumIntroPoint {
  icon: string;
  title: string;
  text: string;
}

/** The editors' intro of the forum, with every missing value made empty. */
export interface ForumIntroTexts {
  title: string;
  text: string;
  points: ForumIntroPoint[];
}

const EMPTY_INTRO: ForumIntroTexts = { title: '', text: '', points: [] };

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Drops what an editor left empty, so the page only asks whether there is an intro. */
export const toForumIntroTexts = (global: Partial<ForumIntro>): ForumIntroTexts => ({
  title: text(global.title),
  text: text(global.text),
  points: (global.points ?? [])
    .map((row) => ({ icon: text(row.icon), title: text(row.title), text: text(row.text) }))
    .filter((row) => row.title !== ''),
});

const readForumIntro = async (locale: Locale): Promise<ForumIntroTexts> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'forum-intro', 'global:forum-intro');

  return await withSpan('getForumIntro', async () => {
    const payload = await getPayload({ config });
    const global = await payload.findGlobal({
      slug: 'forum-intro',
      locale,
      // written in German first; a missing translation shows the German one
      fallbackLocale: LOCALE.DE,
      depth: 0,
    });
    return toForumIntroTexts(global);
  });
};

/**
 * The forum's intro in the caller's language, cached across requests and expired by the
 * global's `afterChange` hook. Empty when editors wrote none, and the forum then opens as is.
 */
export const getForumIntro = trpcBaseProcedure
  .input(z.object({}))
  .query(async ({ ctx }): Promise<ForumIntroTexts> => {
    // during `next build` there is no database, and this must not reach the persistent cache
    if (isBuildPhase()) return EMPTY_INTRO;
    return await readForumIntro(ctx.locale);
  });
