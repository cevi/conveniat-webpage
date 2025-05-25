import type { Permission } from '@/features/payload-cms/payload-types';
import { hasPermissions } from '@/utils/has-permissions';
import type { Access, PayloadRequest } from 'payload';

interface AccessArguments {
  req: PayloadRequest;
  id?: string | number;
}

export const canAccessIdInCollection = (collection: 'documents'): Access => {
  return async ({ req: { user, payload }, id }: AccessArguments) => {
    if (user?.adminPanelAccess) return true;

    if (!id) return false;

    const document = await payload.findByID({
      collection,
      id,
    });

    return await hasPermissions(document.permissions as Permission);
  };
};
