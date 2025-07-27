import type { LinkFieldDataType } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import type { Blog, GenericPage, Permission } from '@/features/payload-cms/payload-types';
import { hasPermissions } from '@/utils/has-permissions';

export const hasPermissionsForLinkField = async (
  linkFieldData?: LinkFieldDataType,
): Promise<boolean> => {
  if (!linkFieldData) return false;
  const { type } = linkFieldData;
  if (type === 'custom') {
    return true;
  }
  // reference field --> either blog or GenericPage
  if (!linkFieldData.reference?.value) return false;
  const { relationTo, value } = linkFieldData.reference;

  if (relationTo === 'blog') {
    const blog = value as Blog;
    const permission = blog.content.permissions as Permission;
    return await hasPermissions(permission);
  }

  const page = value as GenericPage;
  if (typeof page !== 'object') return false; // abort
  const permission = page.content.permissions as Permission;
  return await hasPermissions(permission);
};

// eslint-disable-next-line complexity
export const getURLForLinkField = (linkFieldData?: LinkFieldDataType): string | undefined => {
  if (!linkFieldData) return undefined;

  const { type } = linkFieldData;

  if (type === 'custom') {
    return linkFieldData.url ?? undefined;
  }

  if (type === 'reference' && linkFieldData.reference?.value) {
    const { relationTo, value } = linkFieldData.reference;

    if (relationTo === 'blog') {
      const urlSlug = (value as Blog).seo.urlSlug;
      return urlSlug ? `/blog/${urlSlug}` : undefined;
    }

    // if the reference is not of type GenericPage
    if (typeof value === 'string') {
      return undefined; // abort
    }

    const urlSlug = (value as GenericPage).seo.urlSlug;
    if (urlSlug === '') {
      return '/';
    }
    return '/' + urlSlug;
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
    return linkFieldData.openInNewTab ?? false;
  }

  return false;
};
