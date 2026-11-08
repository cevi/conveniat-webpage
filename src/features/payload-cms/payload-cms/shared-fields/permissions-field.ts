import { withSpan } from '@/utils/tracing-helpers';
import type { Field, PayloadRequest } from 'payload';

/** Where a request keeps its lookup of the public permission. */
const PUBLIC_PERMISSION_LOOKUP = 'publicPermissionLookup';

/**
 * Finds the permission marked public.
 *
 * @param request the request the default value is filled in for
 */
const findPublicPermission = (request: PayloadRequest): Promise<string | undefined> =>
  withSpan('defaultPublicPermission', async () => {
    const { docs } = await request.payload.find({
      collection: 'permissions',
      where: {
        'special_permissions.public': {
          equals: true,
        },
      },
      limit: 1,
      depth: 0,
      pagination: false,
      req: request,
    });
    return docs[0]?.id;
  });

/**
 * The id of the permission marked public, the default of every `permissions` field.
 *
 * Payload fills a missing default on every read, once per document, so a list of 50 pages
 * looked the permission up 97 times. The first lookup of a request is kept in `req.context` for
 * the rest of it, never longer, so an editor's change to the public permission shows on the next
 * request. A failed lookup is not kept.
 *
 * @param args the request the default value is filled in for
 * @param args.req the request
 */
export const defaultPublicPermission = ({
  req: request,
}: {
  req: PayloadRequest;
}): Promise<string | undefined> => {
  const kept = request.context[PUBLIC_PERMISSION_LOOKUP] as Promise<string | undefined> | undefined;
  if (kept !== undefined) return kept;

  const lookup = findPublicPermission(request).catch((error: unknown) => {
    delete request.context[PUBLIC_PERMISSION_LOOKUP];
    throw error;
  });
  request.context[PUBLIC_PERMISSION_LOOKUP] = lookup;
  return lookup;
};

export const permissionsField: Field = {
  name: 'permissions',
  label: {
    en: 'Permissions',
    de: 'Berechtigungen',
    fr: 'Autorisations',
  },
  type: 'relationship',
  relationTo: 'permissions',
  required: false, // default: publicly accessible
  defaultValue: defaultPublicPermission,
};
