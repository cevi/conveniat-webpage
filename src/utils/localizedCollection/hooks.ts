import { useDocumentInfo } from '@payloadcms/ui';
import { locales as localesDefinition } from '@/utils/globalDefinitions';
import { Locale } from 'payload';
import { Blog, Config } from '@/payload-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalizedDoc } from '@/utils/localizedCollection/utils';

type LocalizedStatus = Record<Config['locale'], boolean> | undefined
type LocalizedPublishingStatus = Record<Config['locale'], { published: boolean }>

/**
 * Hook to check if a document is published in all locales
 *
 * @returns an object with the locales as keys and a boolean as value
 *
 */
export const useIsPublished = () => {
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublished, setIsPublished] = useState<LocalizedStatus>(undefined);

  const {
    error: _error,
    doc: _doc,
    isLoading: _isLoading,
  } = useLocalizedDoc<Blog>({ draft: false });

  useEffect(() => {
    setError(_error);
    setIsLoading(_isLoading);

    if (_doc) {
      const published = localesDefinition
        .map((l: Locale) => l.code)
        .reduce((acc, _locale) => {
          const locale = _locale as Config['locale'];
          const state: boolean = (_doc._localized_status as unknown as LocalizedPublishingStatus)[
            locale
          ].published;
          return { ...acc, [locale]: state };
        }, {});
      setIsPublished(published as LocalizedStatus);
    }
  }, [_doc, _error, _isLoading]);

  return { isPublished, isLoading, error };
};

type FieldDef = {
  name: string
  type: string
  localized: boolean
  presentational: boolean
  fields: FieldDef[]
}

type PayloadDoc = Record<string, Record<Config['locale'], string>>

/**
 * Checks if two values are different
 *
 * @param locale
 * @param fieldDef
 * @param value1
 * @param value2
 */
const isDiff = (
  locale: Config['locale'],
  fieldDef: FieldDef,
  value1: Record<Config['locale'], string>,
  value2: Record<Config['locale'], string>,
): boolean => {
  if (fieldDef.localized) return value1[locale] !== value2[locale];
  return !fieldDef.presentational && value1 !== value2;
};

/**
 * Recursively checks if two documents have differences
 *
 * @param locale the locale for which to check the diffs
 * @param fieldDefs the field definitions of the document
 * @param doc1 the first document
 * @param doc2 the second document
 */
// eslint-disable-next-line complexity
const hasDiffs = (
  locale: Config['locale'],
  fieldDefs: FieldDef[],
  doc1: PayloadDoc | undefined,
  doc2: PayloadDoc | undefined,
): boolean => {
  if (!doc1 || !doc2) return false;

  const ignoredFields = new Set(['updatedAt', 'createdAt', '_status']);

  for (const fieldDef of fieldDefs) {
    if (ignoredFields.has(fieldDef.name)) continue;

    const { name, type, fields } = fieldDef;
    const value1 = doc1[name];
    const value2 = doc2[name];

    if (type === 'collapsible' && hasDiffs(locale, fields, doc1, doc2)) return true;
    if (isDiff(locale, fieldDef, value1, value2)) return true;
  }

  return false;
};

/**
 * Hook to check if a document has pending changes in all locales
 *
 * @returns an object with the locales as keys and a boolean as value
 */
export const useHasPendingChanges = () => {
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState<LocalizedStatus>(undefined);

  const {
    error: _error_draft,
    doc: _doc_draft,
    isLoading: _isLoading_draft,
  } = useLocalizedDoc<PayloadDoc>({ draft: true });
  const {
    error: _error,
    doc: _doc,
    isLoading: _isLoading,
  } = useLocalizedDoc<PayloadDoc>({ draft: false });

  const { docConfig } = useDocumentInfo();
  const fields = useMemo(() => docConfig?.fields, [docConfig?.fields]) as FieldDef[];

  const getHasChanges = useCallback(() => {
    return localesDefinition.reduce(
      (acc, locale) => {
        acc[locale.code] = hasDiffs(locale.code as Config['locale'], fields, _doc, _doc_draft);
        return acc;
      },
      {} as Record<string, boolean>,
    );
  }, [_doc, _doc_draft, fields]);

  useEffect(() => {
    setError(_error || _error_draft);
    setIsLoading(_isLoading || _isLoading_draft);
    if (_doc && _doc_draft) setHasUnpublishedChanges(getHasChanges());
  }, [_doc, _doc_draft, _error, _error_draft, _isLoading, _isLoading_draft, fields, getHasChanges]);

  return { hasUnpublishedChanges, isLoading, error };
};
