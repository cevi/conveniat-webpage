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
  locale?: Locale;
}): string => {
  const lang = locale?.code ?? 'de';

  // Decoupled from the T3-Env module to prevent client-side bundle crashes.
  let host = '';

  // eslint-disable-next-line unicorn/no-typeof-undefined
  if (typeof globalThis !== 'undefined' && typeof globalThis.location !== 'undefined') {
    host = globalThis.location.origin;
    // eslint-disable-next-line n/no-process-env, unicorn/no-typeof-undefined
  } else if (typeof process !== 'undefined' && typeof process.env !== 'undefined') {
    // eslint-disable-next-line n/no-process-env
    host = process.env['NEXT_PUBLIC_APP_HOST_URL'] ?? '';
  }

  if (data === undefined || data === null) return '';

  // We must always include the prefix, even for the default locale ('de').
  // If we omit it, the `next-i18n-router` will rely on its persistent `NEXT_LOCALE` cookie,
  // permanently trapping the iframe in a foreign language (e.g., French) if the user
  // toggles back and forth. Passing `/de/` commands the middleware to cleanly overwrite the cookie.
  const prefix = `/${lang}`;

  if (collectionConfig) {
    if (collectionConfig.slug === 'timeline' && data.id !== undefined) {
      return `${host}${prefix}/timeline-preview/${data.id}?preview=true`;
    }

    if (collectionConfig.slug === 'forms' && data.id !== undefined) {
      const urlSlugs: StaticTranslationString = {
        en: 'form-preview',
        de: 'formular-vorschau',
        fr: 'apercu-du-formulaire',
      };

      return `${host}${prefix}/${urlSlugs[lang as LocaleType]}/${data.id}?preview=true`;
    }

    if (collectionConfig.slug === 'camp-map-annotations' && data.id !== undefined) {
      return `${host}/app/map?locationId=${data.id}&preview=true`;
    }
  }

  // Fallback to the home page if the document doesn't have a specific slug yet
  if (typeof data.seo?.urlSlug !== 'string') {
    return `${host}${prefix}/preview-fallback?preview=true`;
  }

  const urlSlug = data.seo.urlSlug;
  // Prevent double slashes when root page 'home' or '/' is mapped
  const slugPath =
    urlSlug === '/' || urlSlug === 'home' || urlSlug === 'index' || urlSlug === ''
      ? ''
      : `/${urlSlug}`;

  console.log('urlSlug', urlSlug);
  return `${host}${prefix}${
    collectionConfig?.slug === 'blog' ? `/blog` : ''
  }${slugPath}?preview=true`;
};
