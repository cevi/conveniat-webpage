import type { Locale } from '@/types/types';

/**
 * Appends the locale to a document URL, so the file endpoint can name the download after the
 * display name in that locale. Distinct URLs also keep browser and service worker caches from
 * serving one locale's file name to another.
 *
 * @param url the document URL as stored by Payload
 * @param locale the locale the page is rendered in
 * @returns the URL with a `locale` search parameter
 */
export const withLocaleParameter = (url: string, locale: Locale): string =>
  `${url}${url.includes('?') ? '&' : '?'}locale=${locale}`;

// RFC 5987 leaves these unescaped by encodeURIComponent, but they are not attr-chars
const encodeRfc5987 = (value: string): string =>
  encodeURIComponent(value).replaceAll(
    /['()*]/g,
    (character) => `%${character.codePointAt(0)?.toString(16).toUpperCase() ?? ''}`,
  );

/**
 * Builds a `Content-Disposition` header that keeps the file inline, so it still opens in the
 * browser, but names it after the display name when the visitor saves it.
 *
 * @param title the display name of the document in the requested locale
 * @param filename the stored file name, whose extension is kept
 * @returns the header value, or `undefined` when there is no display name to use
 */
export const buildDocumentContentDisposition = (
  title: string | null | undefined,
  filename: string,
): string | undefined => {
  // quotes, backslashes and control characters would break the header, slashes the file name
  const cleanedTitle = [...(title ?? '')]
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code >= 0x20 && code !== 0x7f && character !== '"' && character !== '\\';
    })
    .join('')
    .replaceAll(/[/:]/g, '-')
    .trim();
  if (cleanedTitle === '') return undefined;

  const extensionIndex = filename.lastIndexOf('.');
  const extension = extensionIndex > 0 ? filename.slice(extensionIndex) : '';
  const name =
    extension !== '' && !cleanedTitle.toLowerCase().endsWith(extension.toLowerCase())
      ? `${cleanedTitle}${extension}`
      : cleanedTitle;

  // older clients only read `filename`, which must stay ASCII; NFKD turns fullwidth quotes and
  // backslashes into ASCII ones, so those are stripped again after normalizing
  const asciiName = name
    .normalize('NFKD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .replaceAll(/["\\]/g, '')
    .replaceAll(/[^\u0020-\u007E]/g, '_');

  return `inline; filename="${asciiName}"; filename*=UTF-8''${encodeRfc5987(name)}`;
};
