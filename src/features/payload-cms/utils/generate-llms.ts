import { environmentVariables } from '@/config/environment-variables';
import { enabledLocales } from '@/features/payload-cms/payload-cms/locales';
import type { LlmsSourceDocument } from '@/features/payload-cms/utils/llms-txt';
import { renderLlmsTxt, toLlmsLinks } from '@/features/payload-cms/utils/llms-txt';
import { i18nConfig, type Locale } from '@/types/types';
import config from '@payload-config';
import { cacheLife, cacheTag } from 'next/cache';
import { getPayload } from 'payload';

const COLLECTIONS = [
  { slug: 'generic-page', urlPrefix: '', heading: 'Seiten' },
  { slug: 'blog', urlPrefix: 'blog', heading: 'Blog' },
] as const;

/**
 * Generates the content of /llms.txt: the site name and description from the SEO settings,
 * followed by every page and blog post an anonymous visitor can open.
 *
 * A failing read is not caught here. The route then answers with an error and nothing is
 * cached, instead of a truncated list being served for hours.
 */
export const cachedLlmsGenerator = async (): Promise<string> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'global:SEO', 'collection:generic-page', 'collection:blog');

  const payload = await getPayload({ config });
  const defaultLocale = i18nConfig.defaultLocale as Locale;
  const currentDate = new Date().toISOString();

  const seo = await payload.findGlobal({
    slug: 'SEO',
    locale: defaultLocale,
    select: { defaultTitle: true, defaultDescription: true },
  });

  const sections = await Promise.all(
    COLLECTIONS.map(async ({ slug, urlPrefix, heading }) => {
      const { docs } = await payload.find({
        collection: slug,
        // populates the permission, which decides whether the document is public
        depth: 1,
        pagination: false,
        locale: 'all',
        where: { 'content.releaseDate': { less_than_equal: currentDate } },
        select: {
          _localized_status: true,
          content: { pageTitle: true, blogH1: true, permissions: true },
          seo: { urlSlug: true, metaDescription: true },
        },
      });

      return {
        heading,
        // `locale: 'all'` returns every localized field keyed by locale, unlike the generated type
        links: toLlmsLinks(docs as unknown as LlmsSourceDocument[], {
          hostUrl: environmentVariables.APP_HOST_URL,
          locales: enabledLocales,
          defaultLocale,
          urlPrefix,
        }),
      };
    }),
  );

  return renderLlmsTxt({
    title: seo.defaultTitle,
    description: seo.defaultDescription,
    sections,
  });
};
