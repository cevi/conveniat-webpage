import type { Locale } from '@/types/types';

export interface SimplifiedImageType {
  alt_de: string;
  alt_en: string;
  alt_fr: string;
  imageCaption_de?: string | undefined | null;
  imageCaption_en?: string | undefined | null;
  imageCaption_fr?: string | undefined | null;
}

export const getImageAltInLocale = (locale: Locale, image?: SimplifiedImageType): string => {
  if (!image) return '';
  if (locale === 'de') return image.alt_de;
  else if (locale === 'en') return image.alt_en;
  return image.alt_fr;
};

export const getImageCaptionInLocale = (
  locale: Locale,
  image?: SimplifiedImageType,
): string | undefined | null => {
  if (!image) return '';
  if (locale === 'de') return image.imageCaption_de;
  else if (locale === 'en') return image.imageCaption_en;
  return image.imageCaption_fr;
};

export const getRelativeImageUrl = (url?: string | null): string => {
  if (!url) return '';
  try {
    // eslint-disable-next-line n/no-process-env
    const appHostUrl = process.env['NEXT_PUBLIC_APP_HOST_URL'] ?? process.env['APP_HOST_URL'];
    if (appHostUrl && url.startsWith(appHostUrl)) {
      return url.replace(appHostUrl, '');
    }
    if (url.startsWith('http://localhost:3000')) {
      return url.replace('http://localhost:3000', '');
    }
  } catch {
    // Ignore errors
  }
  return url;
};
