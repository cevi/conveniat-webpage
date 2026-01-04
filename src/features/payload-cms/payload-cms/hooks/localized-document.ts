import {
  fetchDocument,
  fetchGlobalDocument,
  NotYetSavedException,
} from '@/features/payload-cms/payload-cms/components/multi-lang-publishing/utils';
import { useDebounce, useDocumentInfo } from '@payloadcms/ui';
import { useQuery } from '@tanstack/react-query';

interface UseLocalizedDocumentReturn<T> {
  doc: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
  isGlobal: boolean;
}

/**
 *
 * Retrieves the localized version of a document of a given collection.
 * It uses the Payload REST API to fetch the documents
 *
 * @param draft
 */
export const useLocalizedDocument = <T>({
  draft,
}: {
  draft: boolean;
}): UseLocalizedDocumentReturn<T> => {
  const debouncedParameters = useDebounce(useDocumentInfo(), 1000);
  const { collectionSlug, globalSlug, id } = debouncedParameters;

  const queryKey = ['localizedDocument', collectionSlug, globalSlug, id, draft];

  const queryFunction = async (): Promise<{ doc: T; isGlobal: boolean }> => {
    if (collectionSlug === undefined && globalSlug === undefined) {
      throw new Error('Invalid object (neither collection nor global)');
    }

    if (collectionSlug !== undefined) {
      if (id === undefined) {
        throw new NotYetSavedException();
      }
      const document = await fetchDocument<T>({
        slug: collectionSlug,
        id: id as string,
        draft,
      });
      return { doc: document, isGlobal: false };
    }

    const document = await fetchGlobalDocument<T>({
      slug: globalSlug as string,
      draft,
    });
    return { doc: document, isGlobal: true };
  };

  const { data, isLoading, error } = useQuery({
    queryKey: queryKey,
    queryFn: queryFunction,
    enabled: collectionSlug !== undefined || globalSlug !== undefined,
  });

  return {
    doc: data?.doc,
    isLoading,
    error: error ?? undefined,
    isGlobal: data?.isGlobal ?? false,
  };
};
