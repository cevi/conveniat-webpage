import { useLocalizedDocument } from '@/features/payload-cms/payload-cms/hooks/localized-document';
import { locales as localesDefinition } from '@/features/payload-cms/payload-cms/locales';
import type { Config } from '@/features/payload-cms/payload-types';
import type { Locale as LocaleType } from '@/types/types';
import type { Locale } from 'payload';
import { useEffect, useState } from 'react';

type LocalizedStatus = Record<Config['locale'], boolean> | undefined;
type LocalizedPublishingStatus = Record<Config['locale'], { published: boolean } | undefined>;

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
  canUnpublish: boolean;
} => {
  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isPublished, setIsPublished] = useState<LocalizedStatus>();

  const {
    error: _error,
    doc: _document,
    isLoading: _isLoading,
  } = useLocalizedDocument<T>({ draft: false });

  useEffect(() => {
    setError(_error);
    setIsLoading(_isLoading);

    if (_document) {
      const published = localesDefinition
        .map((l: Locale) => l.code)
        .reduce((accumulator, _locale) => {
          const locale = _locale as Config['locale'];
          const state: boolean =
            // _document._localized_status might be undefined/null after deletion operations
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            _document._localized_status !== undefined &&
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            _document._localized_status !== null &&
            Object.prototype.hasOwnProperty.call(_document._localized_status, locale) &&
            _document._localized_status[locale] !== undefined &&
            _document._localized_status[locale].published === true;
          return { ...accumulator, [locale]: state };
        }, {});
      setIsPublished(published as LocalizedStatus);
    }
  }, [_document, _error, _isLoading]);

  return {
    isPublished,
    isLoading,
    error,
    canUnpublish:
      (_document as { _disable_unpublishing?: boolean } | undefined)?.['_disable_unpublishing'] ===
      false,
  };
};
