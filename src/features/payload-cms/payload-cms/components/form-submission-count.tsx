'use client';

import type { Config } from '@/features/payload-cms/payload-types';
import type { StaticTranslationString } from '@/types/types';
import { useDocumentInfo, useLocale } from '@payloadcms/ui';
import React, { useEffect, useState } from 'react';

const totalSubmissionsLabel: StaticTranslationString = {
  en: 'Total Submissions',
  de: 'Anzahl Einreichungen',
  fr: 'Nombre total de soumissions',
};

export const FormSubmissionCount: React.FC = () => {
  const { id } = useDocumentInfo();
  const { code } = useLocale() as { code: Config['locale'] };
  const [count, setCount] = useState<number>();

  useEffect(() => {
    if (id === undefined) return;

    fetch(`/api/form-submissions?where[form][equals]=${id}&limit=1`)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch submission count');
        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        if (
          typeof data === 'object' &&
          data !== null &&
          'totalDocs' in data &&
          typeof (data as Record<string, unknown>)['totalDocs'] === 'number'
        ) {
          setCount((data as Record<string, number>)['totalDocs']);
        }
      })
      .catch(console.error);
  }, [id]);

  if (id === undefined || count === undefined) {
    return <></>;
  }

  return (
    <div className="mb-8 text-base">
      <span className="font-semibold">{totalSubmissionsLabel[code]}:</span> {count}
    </div>
  );
};
