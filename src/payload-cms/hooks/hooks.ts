import { useDebounce, useDocumentInfo } from '@payloadcms/ui';
import { locales as localesDefinition } from '@/payload-cms/locales';
import { Locale } from 'payload';
import { Config } from '@/payload-types';
import { useEffect, useState } from 'react';
import {
  fetchDocument,
  fetchGlobalDocument,
  NotYetSavedException,
} from '@/payload-cms/components/multi-lang-publishing/utils';
import { Locale as LocaleType } from '@/types';

type LocalizedStatus = Record<Config['locale'], boolean> | undefined;
type LocalizedPublishingStatus = Record<Config['locale'], { published: boolean } | undefined>;

/**
 *
 * Retrieves the localized version of a document of a given collection.
 * It uses the Payload REST API to fetch the documents
 *
 * @param draft
 */
export const useLocalizedDocument = <T>({ draft }: { draft: boolean }) => {
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

/**
 * Hook to check if a document is published in all locales
 *
 * @returns an object with the locales as keys and a boolean as value
 *
 */
export const useIsPublished = <
  T extends {
    _localized_status: LocalizedPublishingStatus;
  },
>(): {
  isLoading: boolean;
  isPublished: Record<LocaleType, boolean> | undefined;
  error: Error | undefined;
} => {
  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isPublished, setIsPublished] = useState<LocalizedStatus>();

  const {
    error: _error,
    doc: _document,
    isLoading: _isLoading,
    isGlobal: _isGlobal,
  } = useLocalizedDocument<T>({ draft: false });

  useEffect(() => {
    setError(_error);
    setIsLoading(_isLoading);

    if (_document && !_isGlobal) {
      const published = localesDefinition
        .map((l: Locale) => l.code)
        // eslint-disable-next-line unicorn/no-array-reduce
        .reduce((accumulator, _locale) => {
          const locale = _locale as Config['locale'];
          const state: boolean = Boolean(
            (_document._localized_status as unknown as LocalizedPublishingStatus)[locale]
              ?.published,
          );
          return { ...accumulator, [locale]: state };
        }, {});
      setIsPublished(published as LocalizedStatus);
    }

    // globals cannot be unpublished
    if (_isGlobal) {
      // TODO: map over localesDefinition instead of hardcoding the locales
      setIsPublished({ en: true, de: true, fr: true });
    }
  }, [_document, _error, _isGlobal, _isLoading]);

  return { isPublished, isLoading, error };
};
