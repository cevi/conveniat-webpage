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
