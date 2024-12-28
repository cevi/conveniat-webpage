import { useDebounce, useDocumentInfo } from '@payloadcms/ui';
import { locales as localesDefinition } from '@/payload-cms/locales';
import { Block, Locale, Tab } from 'payload';
import { Config } from '@/payload-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchDocument,
  fetchGlobalDocument,
  NotYetSavedException,
} from '@/payload-cms/components/multi-lang-publishing/utils';

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
  isPublished: Record<'en' | 'de' | 'fr', boolean> | undefined;
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

type Field = {
  name: string;
  type: string;
  localized: boolean;
  presentational: boolean;
  fields?: Field[];
  tabs?: (Tab & { name: string })[];
  blocks?: (Block & { slug: string })[];
};

type PayloadDocument = Record<string, Record<Config['locale'], string>>;

/**
 * Checks if two values are different.
 *
 * Returns false if one of the values is undefined or null.
 * Returns true if the values are different.
 *
 * @param locale
 * @param field
 * @param value1
 * @param value2
 */
const hasFieldDifferentValue = (
  locale: Config['locale'] | undefined,
  field: Field,
  value1: unknown,
  value2: unknown,
): boolean => {
  if (value1 === undefined || value2 === undefined) return false;
  if (value1 === null || value2 === null) return false;

  if (field.localized) {
    if (locale === undefined) throw new Error('Locale is undefined but field is localized');
    const v1 = value1 as Record<Config['locale'], string>;
    const v2 = value2 as Record<Config['locale'], string>;
    return JSON.stringify(v1[locale]) !== JSON.stringify(v2[locale]);
  }

  return !field.presentational && JSON.stringify(value1) !== JSON.stringify(value2);
};

/**
 * Recursively checks if two documents have differences.
 *
 * If the document is invalid, i.e. it contains undefined values,
 * it will return false (no diffs). This may happen after a schema change.
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
  if (document1 === undefined || document2 === undefined) return false;

  const ignoredFields = new Set(['Versions', 'updatedAt', 'createdAt', '_status']);

  for (const field of fieldDefs) {
    if (ignoredFields.has(field.name)) continue; // skip ignored fields

    const { name, type, fields, tabs, blocks } = field;
    const value1 = document1[name] as unknown;
    const value2 = document2[name] as unknown;

    switch (type) {
      case 'blocks': {
        if (blocks === undefined) throw new Error('Blocks are undefined');

        type BlockType = Record<string, unknown>;
        type LocalizedBlockType = Record<Config['locale'], BlockType[]>;

        const blocks1 = field.localized
          ? (value1 as LocalizedBlockType)[locale]
          : (value1 as BlockType[]);
        const blocks2 = field.localized
          ? (value2 as LocalizedBlockType)[locale]
          : (value2 as BlockType[]);

        for (const block1 of blocks1) {
          const blockType = block1['blockType'];
          const block2 = blocks2.find((b) => b['id'] === block1['id']);
          if (block2 === undefined) return true; // block not found in document2

          const blockTypeDefinition = blocks.find((b) => b.slug === blockType);
          if (blockTypeDefinition === undefined) throw new Error('Block type not found');

          if (
            hasDiffs(
              locale,
              blockTypeDefinition['fields'] as Field[],
              block1 as PayloadDocument,
              block2 as PayloadDocument,
            )
          )
            return true;
        }

        break; // no diff found, continue with the next field
      }

      case 'tabs': {
        if (tabs === undefined) throw new Error('Tabs are undefined');

        for (const tab of tabs) {
          const tabName = tab.name;
          const tabValue1 = document1[tabName] as unknown as PayloadDocument;
          const tabValue2 = document2[tabName] as unknown as PayloadDocument;
          const tabFields = tab.fields as Field[];
          if (hasDiffs(locale, tabFields, tabValue1, tabValue2)) {
            return true;
          }
        }

        break; // no diff found, continue with the next field
      }

      // handle nested with sub-fields (fields: Field[])
      case 'group':
      case 'row':
      case 'collapsible':
      case 'array': {
        if (fields === undefined) throw new Error('Fields are undefined');
        if (hasDiffs(locale, fields, value1 as PayloadDocument, value2 as PayloadDocument))
          return true;
        break; // no diff found, continue with the next field
      }

      // handle relationship fields

      // handle leaf fields
      case 'textarea':
      case 'text':
      case 'select':
      case 'richText':
      case 'radio':
      case 'point':
      case 'number':
      case 'email':
      case 'date':
      case 'json':
      case 'code':
      case 'checkbox': {
        if (hasFieldDifferentValue(locale, field, value1, value2)) return true;
        break; // no diff found, continue with the next field
      }

      // handle relationship fields
      case 'join':
      case 'relationship':
      case 'upload': {
        type UploadRecord = Record<Config['locale'], { id: string } | undefined>;
        if (field.localized) {
          const v1 = value1 as UploadRecord;
          const v2 = value2 as UploadRecord;
          if (v1[locale] === undefined || v2[locale] === undefined) return false;

          if (v1[locale].id !== v2[locale].id) return true;
          break; // no diff found, continue with the next field
        }

        if (value1 === undefined || value2 === undefined) return false;
        const v1 = value1 as { id: string } | undefined;
        const v2 = value2 as { id: string } | undefined;
        if (!field.presentational && v1?.id !== v2?.id) return true;
        break; // no diff found, continue with the next field
      }

      // ignored fields
      case 'ui': {
        break; // continue with the next field
      }

      // fallback for unimplemented field types
      default: {
        throw new Error(`Field type ${field.type} not implemented`);
      }
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
