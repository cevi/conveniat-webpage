import type { CollectionSlug } from 'payload';

export const fetchDocument = async <T>({
  slug,
  id,
  draft,
}: {
  slug: CollectionSlug;
  id: string;
  draft: boolean;
}): Promise<T> => {
  const url = `/api/${slug}/${id}?depth=1&draft=${draft ? 'true' : 'false'}&locale=all`;

  const response = await fetch(url);
  return (await response.json()) as T;
};

export class NotYetSavedException extends Error {
  constructor() {
    super('Document not yet saved');
  }
}

export const fetchGlobalDocument = async <T>({
  slug,
  draft,
}: {
  slug: string;
  draft: boolean;
}): Promise<T> => {
  const url = `/api/globals/${slug}?depth=1&draft=${draft ? 'true' : 'false'}&locale=all`;

  const response = await fetch(url);
  return (await response.json()) as T;
};
