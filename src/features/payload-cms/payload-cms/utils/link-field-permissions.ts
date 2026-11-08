import type { LinkFieldDataType } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import type { Document, GenericPage, Permission } from '@/features/payload-cms/payload-types';
import { hasPermissions } from '@/utils/has-permissions';

/**
 * Whether the signed-in person may see where a link field points. Server only: it reads the
 * session, which is why it lives apart from the URL helpers in `link-field-logic.ts`, which
 * client components import.
 */
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
