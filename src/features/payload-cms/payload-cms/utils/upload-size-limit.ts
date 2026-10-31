import type { Locale, StaticTranslationString } from '@/types/types';

const BYTES_PER_MB = 1024 * 1024;

/**
 * The largest file an editor can upload, for every upload collection. Payload's default is 20 MB.
 * The request around it also carries the document's fields, so `client_max_body_size` in
 * nginx/nginx.conf and `proxyClientMaxBodySize` in next.config.ts sit a little above it; raise all
 * three together.
 */
export const MAX_UPLOAD_FILE_BYTES = 100 * BYTES_PER_MB;
export const MAX_UPLOAD_REQUEST_BYTES = MAX_UPLOAD_FILE_BYTES + 5 * BYTES_PER_MB;

const LIMIT_MB = MAX_UPLOAD_FILE_BYTES / BYTES_PER_MB;

/** Keeps a number on the line of its unit, and French guillemets on the line of their words. */
const NBSP = '\u00A0';

/** What the server answers when it stops reading an upload, without knowing the file's name. */
export const fileTooLargeMessage: StaticTranslationString = {
  de: `Die Datei ist zu gross. Erlaubt sind höchstens ${LIMIT_MB}${NBSP}MB pro Datei.`,
  en: `The file is too large. Files can be at most ${LIMIT_MB}${NBSP}MB.`,
  fr: `Le fichier est trop volumineux. La taille maximale est de ${LIMIT_MB}${NBSP}Mo par fichier.`,
};

const SWISS_NUMBER_LOCALES: Record<Locale, string> = { de: 'de-CH', en: 'en-CH', fr: 'fr-CH' };

const formatMegabytes = (bytes: number, locale: Locale): string =>
  new Intl.NumberFormat(SWISS_NUMBER_LOCALES[locale], { maximumFractionDigits: 1 }).format(
    bytes / BYTES_PER_MB,
  );

/**
 * Names the file and its size, for the admin panel, which refuses the file before sending it.
 *
 * @param file - the name and byte size of the refused file
 * @param locale - the admin panel's language
 * @returns the message to show the editor
 */
export const fileTooLargeMessageFor = (
  { name, size }: { name: string; size: number },
  locale: Locale,
): string => {
  const megabytes = formatMegabytes(size, locale);
  switch (locale) {
    case 'en': {
      return `“${name}” is ${megabytes}${NBSP}MB. Files can be at most ${LIMIT_MB}${NBSP}MB.`;
    }
    case 'fr': {
      return `«${NBSP}${name}${NBSP}» fait ${megabytes}${NBSP}Mo. La taille maximale est de ${LIMIT_MB}${NBSP}Mo par fichier.`;
    }
    default: {
      return `«${name}» ist ${megabytes}${NBSP}MB gross. Erlaubt sind höchstens ${LIMIT_MB}${NBSP}MB pro Datei.`;
    }
  }
};

/**
 * The admin panel sends its own language as `Accept-Language` with every form request, so this
 * is the language the editor reads the panel in.
 *
 * @param header - the request's `Accept-Language`, if any
 * @returns the locale to answer in, German when nothing matches
 */
export const localeFromAcceptLanguage = (header: string | null): Locale => {
  const language = header?.split(',')[0]?.split('-')[0]?.trim().toLowerCase();
  if (language === 'en' || language === 'fr') return language;
  return 'de';
};
