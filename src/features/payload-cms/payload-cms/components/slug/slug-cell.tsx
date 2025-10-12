import { slugToUrlMapping } from '@/features/payload-cms/slug-to-url-mapping';
import type { Locale } from '@/types/types';

export const SlugCell: React.FC<{
  cellData: string;
  collectionSlug: string;
  i18n: { language: string };
}> = (properties) => {
  const { cellData, collectionSlug, i18n } = properties;

  // get collectionSlug for url showing
  const realCollectionSlug = slugToUrlMapping.find((item) => item.slug === collectionSlug);

  // show the collection slug in the current admin language (not language selector top right!)
  const collectionSlugToUse = realCollectionSlug?.urlPrefix[i18n.language as Locale];

  return (
    <span>
      /{collectionSlugToUse}
      {collectionSlugToUse && cellData ? '/' : ''}
      {cellData}
    </span>
  );
};
