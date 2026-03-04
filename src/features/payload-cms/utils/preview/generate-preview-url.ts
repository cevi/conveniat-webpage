import { environmentVariables as env } from '@/config/environment-variables';
import type { Locale as LocaleType, StaticTranslationString } from '@/types/types';
import type { CollectionConfig, Locale } from 'payload';

const getHost = (): string => {
  if (typeof document !== 'undefined') {
    return document.location.origin;
  }
  return env.APP_HOST_URL;
};

/**
 * Generates the preview URL for the live preview feature.
 *
 * @param data
 * @param collectionConfig
 * @param locale
 */
export const generatePreviewUrl = async ({
  data,
  collectionConfig,
  locale,
}: {
  data: { seo?: { urlSlug?: string }; id?: string; [key: string]: unknown } | null | undefined;
  collectionConfig?: CollectionConfig;
  locale: Locale;
}): Promise<string> => {
  if (data === null || data === undefined) return '';
  const host = getHost();

  if (collectionConfig !== undefined) {
    if (collectionConfig.slug === 'timeline' && data.id !== undefined) {
      return `${host}/${locale.code}/timeline-preview/${data.id}?preview=true`;
    }

    if (collectionConfig.slug === 'forms' && data.id !== undefined) {
      const urlSlugs: StaticTranslationString = {
        en: 'form-preview',
        de: 'formular-vorschau',
        fr: 'apercu-du-formulaire',
      };

      return `${host}/${locale.code}/${urlSlugs[locale.code as LocaleType]}/${data.id}?preview=true`;
    }

    if (collectionConfig.slug === 'camp-map-annotations' && data.id !== undefined) {
      return `${host}/app/map?locationId=${data.id}&preview=true`;
    }
  }

  // Fallback for generic-page, blog, etc.
  // Because Payload lazy-loads form tabs, the `seo` data might be missing from the client
  // form state if the SEO tab hasn't been opened prior to saving a draft.
  let urlSlug = data.seo?.urlSlug ?? (data['slug'] as string | undefined);

  if (
    (urlSlug === undefined || urlSlug === '') &&
    data.id !== undefined &&
    collectionConfig !== undefined &&
    typeof document !== 'undefined'
  ) {
    try {
      const response = await fetch(`/api/${collectionConfig.slug}/${data.id}?depth=0&draft=true`);
      if (response.ok) {
        const documentData = (await response.json()) as {
          seo?: { urlSlug?: string };
          slug?: string;
        };
        urlSlug = documentData.seo?.urlSlug ?? documentData.slug;
      }
    } catch (error) {
      console.error('generatePreviewUrl: Failed to fetch missing SEO slug', error);
    }
  }

  if (urlSlug === undefined || urlSlug === '') return '';

  return `${host}/${locale.code}/${
    collectionConfig?.slug === 'blog' ? `blog/` : ''
  }${urlSlug}?preview=true`;
};
