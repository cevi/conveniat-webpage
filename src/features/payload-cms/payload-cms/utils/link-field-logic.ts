import type { LinkFieldData } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import type { Blog, GenericPage } from '@/features/payload-cms/payload-types';

export const getURLForLinkField = (linkFieldData?: LinkFieldData): string | undefined => {
  if (!linkFieldData) return undefined;

  const { type } = linkFieldData;

  if (type === 'custom') {
    return linkFieldData.url || undefined;
  }

  if (type === 'reference' && linkFieldData.reference?.value) {
    const { relationTo, value } = linkFieldData.reference;

    if (relationTo === 'blog') {
      const urlSlug = (value as Blog).seo.urlSlug;
      return urlSlug ? `/blog/${urlSlug}` : undefined;
    }

    // always generic-page then
    const urlSlug = (value as GenericPage).seo.urlSlug;
    return urlSlug ? `/${urlSlug}` : undefined;
  }

  return undefined;
};
