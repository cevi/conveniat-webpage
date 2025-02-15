import { locales as localesDefinition } from '@/payload-cms/locales';
import { Locale } from 'payload';
import { Config } from '@/payload-types';
import { useEffect, useState } from 'react';
import { Locale as LocaleType } from '@/types';
import { useLocalizedDocument } from '@/payload-cms/hooks/localized-document';

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
