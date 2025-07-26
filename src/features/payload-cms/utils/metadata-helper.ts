import type { Blog, GenericPage } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import type { Metadata } from 'next';
import type { BasePayload, CollectionSlug } from 'payload';

export async function findAlternatives({
  payload,
  collection,
  internalPageName,
  currentDate,
}: {
  payload: BasePayload;
  collection: CollectionSlug;
  internalPageName: string;
  currentDate?: string;
}): Promise<(GenericPage | Blog)[]> {
  const hasReleaseDate = collection === 'blog';

  const results = await Promise.all(
    i18nConfig.locales.map((l) =>
      payload.find({
        collection,
        pagination: false,
        fallbackLocale: false,
        locale: l as Locale,
        draft: false,
        where: {
          and: [
            { internalPageName: { equals: internalPageName } },
            { _localized_status: { equals: { published: true } } },
            ...(hasReleaseDate
              ? [{ 'content.releaseDate': { less_than_equal: currentDate } }]
              : []),
          ],
        },
      }),
    ),
  );

  return results
    .filter((r) => r.docs.length === 1)
    .flatMap((r) => r.docs[0] as Blog | GenericPage)
    .filter(Boolean);
}
interface SEOType {
  urlSlug: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string | null;
}
export function buildMetadata({
  seo,
  canonicalLocale,
  canonicalSlug,
  alternates,
  prefix = '',
}: {
  seo: SEOType;
  canonicalLocale: string;
  canonicalSlug: string;
  alternates: Record<string, string>;
  prefix?: string;
}): Metadata {
  return {
    ...(seo.metaTitle && { title: seo.metaTitle }),
    ...(seo.metaDescription && { description: seo.metaDescription }),
    ...(seo.keywords && { keywords: seo.keywords }),
    ...(canonicalLocale &&
      canonicalSlug && {
        alternates: {
          canonical: `${prefix}/${canonicalLocale}/${canonicalSlug}`,
          languages: alternates,
        },
      }),
  };
}
