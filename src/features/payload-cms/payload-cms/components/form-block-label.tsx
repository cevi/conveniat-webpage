'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { useLocale, useRowLabel } from '@payloadcms/ui';
import type React from 'react';

/**
 * This component is used to render the label for the row in the array field.

 * @constructor
 */
export const FormBlockLabel: React.FC<{
  label: StaticTranslationString;
}> = ({ label }) => {
  const rowLabel = useRowLabel<{ name?: string }>() as { data: { name?: string } } | undefined;
  const { code } = useLocale();

  if (!rowLabel) {
    return;
  }

  const { data } = rowLabel;
  const customLabel = `${data.name ?? ''}`;

  if (customLabel !== '') {
    return (
      <div>
        {customLabel} ({label[code as Locale]})
      </div>
    );
  }

  return <div>{label[code as Locale]}</div>;
};
