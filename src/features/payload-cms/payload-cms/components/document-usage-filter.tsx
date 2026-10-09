'use client';

import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import { LINKED_QUERY_PARAMETER } from '@/features/payload-cms/payload-cms/utils/document-references';
import type { StaticTranslationString } from '@/types/types';
import { Button, useListDrawerContext, useListQuery, useTranslation } from '@payloadcms/ui';
import type React from 'react';

type Usage = 'yes' | 'no' | undefined;

const options: { value: Usage; label: StaticTranslationString }[] = [
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
  const { query, refineListData } = useListQuery();
  const { isInDrawer } = useListDrawerContext();

  // A drawer lists through a server function whose request carries no page query, so the
  // `baseFilter` could not see the choice there.
  if (isInDrawer) return <></>;

  const locale = resolveAdminLocale(i18n.language);
  const current: unknown = (query as Record<string, unknown>)[LINKED_QUERY_PARAMETER];

  const select = (value: Usage): void => {
    // Through Payload's own list query, so its state and the URL agree on the choice and keep it
    // across sorting and paging. The current page may not exist in the narrowed list.
    void refineListData({ [LINKED_QUERY_PARAMETER]: value, page: 1 });
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
