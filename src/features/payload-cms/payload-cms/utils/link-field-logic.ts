import type { LinkFieldDataType } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import type { Blog, GenericPage, Permission } from '@/features/payload-cms/payload-types';
import { hasPermissions } from '@/utils/has-permissions';
import type { FieldHook } from 'payload';

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

/**
 * Recursively parses an object and inlines 'id' values from nested 'value' objects.
 * Otherwise, we have some issues with the link field.
 *
 * @param object The object to parse.
 * @returns A new object with the 'id' values inlined.
 *
 */
// eslint-disable-next-line complexity
export const replaceInlinedDocumentWithDocumentId = <T>(object: T): T => {
  if (object === null || typeof object !== 'object') {
    return object;
  }

  if (Array.isArray(object)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return object.map((item) => replaceInlinedDocumentWithDocumentId(item)) as T;
  }

  const newObject = { ...object };

  for (const key in newObject) {
    if (Object.prototype.hasOwnProperty.call(newObject, key)) {
      const value = newObject[key];

      newObject[key] =
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        'relationTo' in value &&
        typeof value.relationTo === 'string' &&
        'value' in value &&
        typeof value.value === 'object' &&
        value.value !== null &&
        'id' in value.value
          ? {
              ...value,
              value: value.value.id,
            }
          : replaceInlinedDocumentWithDocumentId(value);
    }
  }

  return newObject;
};

/**
 * Patches an issue where a link within a richText Field causes the
 * document to be invalid. This replaces the inlined document with
 * the uuid, such that the validation logic works correctly.
 *
 * Fixes:
 *  - https://github.com/cevi/conveniat-webpage/issues/594
 *  - https://github.com/cevi/conveniat-webpage/issues/598
 */
export const patchRichTextLinkHook: {
  beforeValidate?: FieldHook[];
} = {
  beforeValidate: [
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    ({ value }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return replaceInlinedDocumentWithDocumentId(value);
    },
  ],
};
