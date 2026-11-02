import type { Permission } from '@/features/payload-cms/payload-types';
import { isPermissionPublic } from '@/utils/has-permissions';
import type { SearchPluginConfig } from '@payloadcms/plugin-search/types';
import type { PayloadRequest } from 'payload';

interface DocumentWithPermission {
  id: string;
  /** where pages keep their permission */
  content?: { permissions?: Permission | string | null };
  /** where documents keep theirs */
  permissions?: Permission | string | null;
}

/**
 * The plugin passes the locale it syncs to `skipSync` but not to `beforeSync`, which runs right
 * after it in the same request. `beforeSync` needs it to read the page in that locale, so it is
 * handed over through the request context. See {@link getSyncLocale}.
 */
const SYNC_LOCALE_CONTEXT_KEY = 'searchSyncLocale';

/** The locale the search plugin is syncing in this request, as `skipSync` last saw it. */
export const getSyncLocale = (request: PayloadRequest): string | undefined => {
  const locale = request.context[SYNC_LOCALE_CONTEXT_KEY];
  return typeof locale === 'string' ? locale : undefined;
};

/**
 * A document is public when it carries no permission at all, or one that is marked public. This
 * mirrors `hasPermissions` for a visitor without a session.
 */
const isPubliclyReadable = async (
  document: DocumentWithPermission,
  request: PayloadRequest,
): Promise<boolean> => {
  const permission = document.content?.permissions ?? document.permissions;
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
 * Keeps everything but public pages and documents out of the search index, and removes the entry
 * of one that stopped being public. News entries have no permission of their own: they are found
 * only through the public pages that show them.
 *
 * The plugin treats an error thrown here as "do not skip" and indexes the document, so every
 * failure is caught and answered with a skip instead.
 */
export const skipSyncOfRestrictedDocuments: NonNullable<SearchPluginConfig['skipSync']> = async ({
  collectionSlug,
  doc,
  locale,
  req,
}) => {
  const document = doc as DocumentWithPermission;
  req.context[SYNC_LOCALE_CONTEXT_KEY] = locale;

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
