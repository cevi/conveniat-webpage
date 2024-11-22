import { useEffect, useState } from 'react';
import { useDebounce, useDocumentInfo } from '@payloadcms/ui';
import { CollectionSlug } from 'payload';

const fetchDoc = async <T>({
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

/**
 *
 * Retrieves the localized version of a document of a given collection.
 * It uses the Payload REST API to fetch the documents
 *
 *
 * @param draft
 */
export const useLocalizedDoc = <T>({ draft }: { draft: boolean }) => {
  const debouncedParams = useDebounce(useDocumentInfo(), 1_000);

  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [doc, setDoc] = useState<T | undefined>(undefined);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    if (!debouncedParams.collectionSlug || !debouncedParams.id) {
      setIsLoading(false);
      setError(new NotYetSavedException());
      return;
    }

    fetchDoc<T>({
      slug: debouncedParams.collectionSlug as CollectionSlug,
      id: debouncedParams.id as string,
      draft,
    })
      .then((_doc) => {
        setDoc(_doc);
      })
      .catch((e: unknown) => {
        setError(e as Error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [debouncedParams, draft]);

  return { doc, isLoading, error };
};
