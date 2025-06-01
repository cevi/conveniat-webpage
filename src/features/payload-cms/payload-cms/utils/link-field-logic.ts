import type { LinkFieldDataType } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import type { Blog, GenericPage } from '@/features/payload-cms/payload-types';

export const getURLForLinkField = (linkFieldData?: LinkFieldDataType): string | undefined => {
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
    return (value as GenericPage).seo.urlSlug;
  }

  return undefined;
};

export const openURLInNewTab = (linkFieldData?: LinkFieldDataType): boolean => {
  if (!linkFieldData) return false;

  const { type } = linkFieldData;

  if (type === 'reference') {
    return false;
  }

  if (type === 'custom') {
    return linkFieldData.openInNewTab || false;
  }

  return false;
};
