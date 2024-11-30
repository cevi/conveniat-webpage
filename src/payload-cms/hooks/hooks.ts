import { useDebounce, useDocumentInfo } from '@payloadcms/ui';
import { locales as localesDefinition } from '@/payload-cms/locales';
import { Locale } from 'payload';
import { Blog, Config } from '@/payload-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchDocument, NotYetSavedException } from '@/payload-cms/utils/utils';

type LocalizedStatus = Record<Config['locale'], boolean> | undefined;
type LocalizedPublishingStatus = Record<Config['locale'], { published: boolean }>;

/**
 *
 * Retrieves the localized version of a document of a given collection.
 * It uses the Payload REST API to fetch the documents
 *
 *
 * @param draft
 */
export const useLocalizedDocument = <T>({ draft }: { draft: boolean }) => {
  const debouncedParameters = useDebounce(useDocumentInfo(), 1000);

  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [document_, setDocument] = useState<T | undefined>();

  useEffect(() => {
    setIsLoading(true);
    setError(undefined);

    if (!debouncedParameters.collectionSlug || !debouncedParameters.id) {
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
  }, [debouncedParameters, draft]);

  return { doc: document_, isLoading, error };
};

/**
 * Hook to check if a document is published in all locales
 *
 * @returns an object with the locales as keys and a boolean as value
 *
 */
export const useIsPublished = () => {
  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isPublished, setIsPublished] = useState<LocalizedStatus>();

  const {
    error: _error,
    doc: _document,
    isLoading: _isLoading,
  } = useLocalizedDocument<Blog>({ draft: false });

  useEffect(() => {
    setError(_error);
    setIsLoading(_isLoading);

    if (_document) {
      const published = localesDefinition
        .map((l: Locale) => l.code)
        // eslint-disable-next-line unicorn/no-array-reduce
        .reduce((accumulator, _locale) => {
          const locale = _locale as Config['locale'];
          const state: boolean = (
            _document._localized_status as unknown as LocalizedPublishingStatus
          )[locale].published;
          return { ...accumulator, [locale]: state };
        }, {});
      setIsPublished(published as LocalizedStatus);
    }
  }, [_document, _error, _isLoading]);

  return { isPublished, isLoading, error };
};

type Field = {
  name: string;
  type: string;
  localized: boolean;
  presentational: boolean;
  fields: Field[];
};

type PayloadDocument = Record<string, Record<Config['locale'], string>>;

/**
 * Checks if two values are different
 *
 * @param locale
 * @param field
 * @param value1
 * @param value2
 */
const isDiff = (
  locale: Config['locale'],
  field: Field,
  value1: Record<Config['locale'], string> | undefined,
  value2: Record<Config['locale'], string> | undefined,
): boolean => {
  if (value1 === undefined || value2 === undefined) return true;

  if (field.localized) return value1[locale] !== value2[locale];
  return !field.presentational && value1 !== value2;
};

/**
 * Recursively checks if two documents have differences
 *
 * @param locale the locale for which to check the diffs
 * @param fieldDefs the field definitions of the document
 * @param document1
 * @param document2
 */
// eslint-disable-next-line complexity
const hasDiffs = (
  locale: Config['locale'],
  fieldDefs: Field[],
  document1: PayloadDocument | undefined,
  document2: PayloadDocument | undefined,
): boolean => {
  if (!document1 || !document2) return false;

  const ignoredFields = new Set(['Versions', 'updatedAt', 'createdAt', '_status']);

  for (const field of fieldDefs) {
    if (ignoredFields.has(field.name)) continue;

    const { name, type, fields } = field;
    const value1 = document1[name] as Record<Config['locale'], string>;
    const value2 = document2[name] as Record<Config['locale'], string>;

    if (type === 'collapsible' && hasDiffs(locale, fields, document1, document2)) {
      return true;
    }

    // some types need special handling
    if (type === 'upload') {
      // @ts-ignore
      if (field.localized) return value1[locale].id !== value2[locale].id;
      // @ts-ignore
      return !field.presentational && value1.id !== value2.id;
    }

    if (isDiff(locale, field, value1, value2)) {
      return true;
    }
  }

  return false;
};

/**
 * Hook to check if a document has pending changes in all locales
 *
 * @returns an object with the locales as keys and a boolean as value
 */
export const useHasPendingChanges = () => {
  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState<LocalizedStatus>();

  const {
    error: _error_draft,
    doc: _document_draft,
    isLoading: _isLoading_draft,
  } = useLocalizedDocument<PayloadDocument>({ draft: true });
  const {
    error: _error,
    doc: _document,
    isLoading: _isLoading,
  } = useLocalizedDocument<PayloadDocument>({ draft: false });

  const { docConfig } = useDocumentInfo();
  const fields = useMemo(() => docConfig?.fields, [docConfig?.fields]) as Field[];

  const getHasChanges = useCallback(() => {
    // eslint-disable-next-line unicorn/no-array-reduce
    return localesDefinition.reduce(
      (accumulator, locale) => {
        accumulator[locale.code] = hasDiffs(
          locale.code as Config['locale'],
          fields,
          _document,
          _document_draft,
        );
        return accumulator;
      },
      {} as Record<string, boolean>,
    );
  }, [_document, _document_draft, fields]);

  useEffect(() => {
    setError(_error ?? _error_draft);
    setIsLoading(_isLoading || _isLoading_draft);
    if (_document && _document_draft) setHasUnpublishedChanges(getHasChanges());
  }, [
    _document,
    _document_draft,
    _error,
    _error_draft,
    _isLoading,
    _isLoading_draft,
    fields,
    getHasChanges,
  ]);

  return { hasUnpublishedChanges, isLoading, error };
};
