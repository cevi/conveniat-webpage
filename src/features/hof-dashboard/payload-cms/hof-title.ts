import type { Field, PayloadRequest } from 'payload';

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
