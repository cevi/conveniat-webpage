'use client';

import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type { StaticTranslationString } from '@/types/types';
import { Button, useTranslation } from '@payloadcms/ui';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';

/** Mirrors `LINKED_QUERY_PARAMETER`, which lives in a server module this file cannot import. */
const LINKED_QUERY_PARAMETER = 'linked';

const options: { value: 'yes' | 'no' | undefined; label: StaticTranslationString }[] = [
  { value: undefined, label: { en: 'All', de: 'Alle', fr: 'Tous' } },
  { value: 'yes', label: { en: 'Linked', de: 'Verlinkt', fr: 'Liés' } },
  { value: 'no', label: { en: 'Not linked', de: 'Nicht verlinkt', fr: 'Non liés' } },
];

const filterLabel: StaticTranslationString = {
  en: 'Usage',
  de: 'Verwendung',
  fr: 'Utilisation',
};

/**
 * Toggle above the documents list between all, linked and unlinked documents. The filter itself is
 * the collection's `baseFilter`, which reads the query parameter this sets.
 */
export const DocumentUsageFilter: React.FC = () => {
  const { i18n } = useTranslation();
  const locale = resolveAdminLocale(i18n.language);
  const router = useRouter();
  const pathname = usePathname();
  const searchParameters = useSearchParams();
  const current = searchParameters.get(LINKED_QUERY_PARAMETER) ?? undefined;

  const select = (value: 'yes' | 'no' | undefined): void => {
    const parameters = new URLSearchParams(searchParameters.toString());
    if (value === undefined) parameters.delete(LINKED_QUERY_PARAMETER);
    else parameters.set(LINKED_QUERY_PARAMETER, value);
    // the current page may not exist in the narrowed list
    parameters.delete('page');
    const query = parameters.toString();
    router.push(query === '' ? pathname : `${pathname}?${query}`);
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-(--theme-elevation-500)">{filterLabel[locale]}:</span>
      {options.map(({ value, label }) => (
        <Button
          key={value ?? 'all'}
          buttonStyle={current === value ? 'primary' : 'pill'}
          size="small"
          margin={false}
          onClick={() => select(value)}
        >
          {label[locale]}
        </Button>
      ))}
    </div>
  );
};
