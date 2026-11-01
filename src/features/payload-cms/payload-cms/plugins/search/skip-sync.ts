import type { Permission } from '@/features/payload-cms/payload-types';
import { isPermissionPublic } from '@/utils/has-permissions';
import type { SearchPluginConfig } from '@payloadcms/plugin-search/types';
import type { PayloadRequest } from 'payload';

interface DocumentWithPermission {
  id: string;
  content?: { permissions?: Permission | string | null };
}

/**
 * A document is public when it carries no permission at all, or one that is marked public. This
 * mirrors `hasPermissions` for a visitor without a session.
 */
const isPubliclyReadable = async (
  document: DocumentWithPermission,
  request: PayloadRequest,
): Promise<boolean> => {
  const permission = document.content?.permissions;
  if (permission === undefined || permission === null) return true;
  if (typeof permission !== 'string') return isPermissionPublic(permission);

  // A trashed or deleted permission resolves to null and keeps the document out of the index.
  const resolved = await request.payload.findByID({
    collection: 'permissions',
    id: permission,
    depth: 0,
    disableErrors: true,
    req: request,
  });
  return isPermissionPublic(resolved);
};

/**
 * Keeps everything but public pages out of the search index, and removes the
 * entry of a document that stopped being public.
 *
 * The plugin treats an error thrown here as "do not skip" and indexes the document, so every
 * failure is caught and answered with a skip instead.
 */
export const skipSyncOfRestrictedDocuments: NonNullable<SearchPluginConfig['skipSync']> = async ({
  collectionSlug,
  doc,
  req,
}) => {
  const document = doc as DocumentWithPermission;

  try {
    if (await isPubliclyReadable(document, req)) return false;

    await req.payload.delete({
      collection: 'search-collection',
      depth: 0,
      req,
      where: {
        and: [
          { 'doc.relationTo': { equals: collectionSlug } },
          { 'doc.value': { equals: document.id } },
        ],
      },
    });
  } catch (error) {
    req.payload.logger.error(
      { err: error, collection: collectionSlug, id: document.id },
      'Search index: could not decide whether the document is public, leaving it out of the index',
    );
  }

  return true;
};
