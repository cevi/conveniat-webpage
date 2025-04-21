import { useDebounce, useDocumentInfo } from '@payloadcms/ui';
import {
  fetchDocument,
  fetchGlobalDocument,
  NotYetSavedException,
} from '@/features/payload-cms/payload-cms/components/multi-lang-publishing/utils';
import { useEffect, useState } from 'react';

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
}): {
  doc: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
  isGlobal: boolean;
} => {
  const debouncedParameters = useDebounce(useDocumentInfo(), 1000);

  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [document_, setDocument] = useState<T | undefined>();
  const [isGlobal, setIsGlobal] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setError(undefined);

    // is neither a collection nor a global
    if (
      debouncedParameters.collectionSlug === undefined &&
      debouncedParameters.globalSlug === undefined
    ) {
      setIsLoading(false);
      setError(new Error('Invalid object (neither collection nor global)'));
      return;
    }

    // check for collection
    if (debouncedParameters.collectionSlug !== undefined) {
      if (debouncedParameters.id === undefined) {
        setIsLoading(false);
        setError(new NotYetSavedException());
        return;
      }

      fetchDocument<T>({
        slug: debouncedParameters.collectionSlug,
        id: debouncedParameters.id as string,
        draft,
      })
        .then((_document) => {
          setDocument(_document);
        })
        .catch((error_: unknown) => {
          setError(error_ as Error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
    // check for global
    else if (debouncedParameters.globalSlug !== undefined) {
      fetchGlobalDocument<T>({
        slug: debouncedParameters.globalSlug as string,
        draft,
      })
        .then((_document) => {
          setDocument(_document);
          setIsGlobal(true);
        })
        .catch((error_: unknown) => {
          setError(error_ as Error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [debouncedParameters, draft]);

  return { doc: document_, isLoading, error, isGlobal };
};
