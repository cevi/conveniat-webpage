import type { Hof } from '@/features/payload-cms/payload-types';
import type { CollectionAfterChangeHook, Field, PayloadRequest } from 'payload';

/**
 * A title like "Hof Nord · Hofbauten", so the admin's lists and relationship pickers read. In
 * German, the language the Ressorts work in.
 */
export const hofTitle = async (
  request: PayloadRequest,
  hofReference: string | { id: string } | null | undefined,
  what: string,
): Promise<string | undefined> => {
  const hofId = typeof hofReference === 'object' ? hofReference?.id : hofReference;
  if (hofId === undefined) return undefined;
  const hof = await request.payload.findByID({
    collection: 'hoefe',
    id: hofId,
    depth: 0,
    disableErrors: true,
    overrideAccess: true,
    select: { name: true },
    req: request,
  });
  return `${hof?.name ?? hofId} · ${what}`;
};

/** The title field the hook above fills; hidden, since it only repeats other fields. */
export const hofTitleField: Field = {
  name: 'title',
  type: 'text',
  label: { de: 'Titel', en: 'Title', fr: 'Titre' },
  admin: { hidden: true },
};

/**
 * Keeps the titles above current when a Hof is renamed: they are stored, so the admin can list
 * and search them, and would otherwise keep the old name. Saving each entry again lets its own
 * hook write the new title.
 */
export const refreshHofTitles: CollectionAfterChangeHook<Hof> = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  if (operation !== 'update' || doc.name === previousDoc.name) return doc;
  for (const collection of ['hof-submissions', 'hof-material-orders'] as const) {
    await req.payload.update({
      collection,
      where: { hof: { equals: doc.id } },
      data: {},
      depth: 0,
      overrideAccess: true,
      req,
    });
  }
  return doc;
};
