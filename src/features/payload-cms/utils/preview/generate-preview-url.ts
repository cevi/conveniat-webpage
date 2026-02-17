import { environmentVariables as env } from '@/config/environment-variables';
import type { Locale as LocaleType, StaticTranslationString } from '@/types/types';
import type { CollectionConfig, Locale } from 'payload';

/**
 * Generates the preview URL for the live preview feature.
 *
 * @param data
 * @param collectionConfig
 * @param locale
 */
export const generatePreviewUrl = ({
  data,
  collectionConfig,
  locale,
}: {
  data: { seo?: { urlSlug?: string }; id?: string } | null | undefined;
  collectionConfig?: CollectionConfig;
  locale: Locale;
}): string => {
  if (data === undefined || data === null) return '';

  if (collectionConfig) {
    if (collectionConfig.slug === 'timeline' && data.id !== undefined) {
      return `${env.APP_HOST_URL}/${locale.code}/timeline-preview/${data.id}?preview=true`;
    }

    if (collectionConfig.slug === 'forms' && data.id !== undefined) {
      const urlSlugs: StaticTranslationString = {
        en: 'form-preview',
        de: 'formular-vorschau',
        fr: 'apercu-du-formulaire',
      };

      return `${env.APP_HOST_URL}/${locale.code}/${urlSlugs[locale.code as LocaleType]}/${data.id}?preview=true`;
    }

    if (collectionConfig.slug === 'camp-map-annotations' && data.id !== undefined) {
      return `${env.APP_HOST_URL}/app/map?locationId=${data.id}&preview=true`;
    }
  }

  if (!data.seo) return '';
  const urlSlug: string | undefined = data.seo.urlSlug;
  if (urlSlug == undefined) return '';

  return `${env.APP_HOST_URL}/${locale.code}/${
    collectionConfig?.slug === 'blog' ? `blog/` : ''
  }${urlSlug}?preview=true`;
};
