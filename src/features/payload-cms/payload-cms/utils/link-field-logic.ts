import type { LinkFieldDataType } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import type {
  Blog,
  CampMapAnnotation,
  CampScheduleEntry,
  Document,
  GenericPage,
  Permission,
} from '@/features/payload-cms/payload-types';
import { getLanguagePrefix } from '@/features/payload-cms/utils/get-language-prefix';
import type { Locale } from '@/types/types';
import { hasPermissions } from '@/utils/has-permissions';
import type { FieldHook } from 'payload';

export const hasPermissionsForLinkField = async (
  linkFieldData?: LinkFieldDataType,
): Promise<boolean> => {
  if (!linkFieldData) return false;
  const { type } = linkFieldData;
  if (type === 'custom' || type === 'email') {
    return true;
  }
  // reference field --> a payload collection
  if (!linkFieldData.reference?.value) return false;
  const { relationTo, value } = linkFieldData.reference;

  switch (relationTo) {
    case 'blog': {
      const blog = value as Blog;
      const permission = blog.content.permissions as Permission;
      return await hasPermissions(permission);
    }
    case 'generic-page': {
      const page = value as GenericPage;
      if (typeof page !== 'object') return false; // abort
      const permission = page.content.permissions as Permission;
      return await hasPermissions(permission);
    }
    case 'images': {
      break; // images are always public
    }
    case 'documents': {
      const document = value as Document;
      const permission = document.permissions as Permission;
      return await hasPermissions(permission);
    }
    // No default
  }
  return true;
};

export const getURLForLinkField = (
  linkFieldData: LinkFieldDataType | undefined,
  locale: Locale,
): string | undefined => {
  if (!linkFieldData) return undefined;

  const { type } = linkFieldData;

  if (type === 'custom') {
    return linkFieldData.url ?? undefined;
  }

  if (type === 'email') {
    return linkFieldData.email ? `mailto:${encodeURIComponent(linkFieldData.email)}` : undefined;
  }

  if (type === 'reference' && linkFieldData.reference?.value !== undefined) {
    const { relationTo, value } = linkFieldData.reference;

    let langPrefix = getLanguagePrefix(locale);
    langPrefix = langPrefix === '' ? '' : `/${langPrefix}`;

    let baseUrl: string | undefined = undefined;

    switch (relationTo) {
      case 'blog': {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (typeof value !== 'object' || value === null || !('seo' in value) || !value.seo)
          return undefined;
        const urlSlug = value.seo.urlSlug;
        if (urlSlug !== '') {
          baseUrl = `${langPrefix}/blog/${urlSlug}`;
        }
        break;
      }
      case 'generic-page': {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (typeof value !== 'object' || value === null || !('seo' in value) || !value.seo) {
          baseUrl = langPrefix === '' ? '/' : langPrefix;
        } else {
          const urlSlug = value.seo.urlSlug;
          if (urlSlug === '') {
            baseUrl = langPrefix === '' ? '/' : langPrefix;
          } else {
            baseUrl = `${langPrefix}/${urlSlug}`;
          }
        }
        break;
      }
      case 'images':
      case 'documents': {
        baseUrl = (value as unknown as { url: string }).url;
        break;
      }
      case 'camp-schedule-entry': {
        const entryId = (value as CampScheduleEntry).id;
        baseUrl = `/app/schedule/${entryId}`;
        break;
      }
      case 'camp-map-annotations': {
        const locationId = (value as CampMapAnnotation).id;
        baseUrl = `/app/map?locationId=${locationId}`;
        break;
      }
      // No default
    }

    if (baseUrl !== undefined) {
      const fragment = linkFieldData.fragment?.trim();
      if (fragment && fragment !== '') {
        const cleanFragment = fragment.startsWith('#') ? fragment.slice(1) : fragment;
        if (cleanFragment !== '') {
          return `${baseUrl}#${encodeURIComponent(cleanFragment)}`;
        }
      }
      return baseUrl;
    }
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
