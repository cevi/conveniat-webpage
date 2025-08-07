import { getImageAltInLocale } from '@/features/payload-cms/payload-cms/utils/images-meta-fields';
import type { Image } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';

interface TwitterImageDescriptor {
  url: string | URL;
  alt?: string | undefined;
  secureUrl?: string | URL | undefined;
  type?: string | undefined;
  width?: string | number | undefined;
  height?: string | number | undefined;
}
export const generateTwitterCardImageSettings = (
  image: Image,
  locale: Locale,
): TwitterImageDescriptor => {
  return {
    url: (image.sizes?.large?.url || image.sizes?.tiny?.url) ?? '',
    alt: getImageAltInLocale(locale, image),
    width: image.width ?? undefined,
    height: image.height ?? undefined,
  };
};
