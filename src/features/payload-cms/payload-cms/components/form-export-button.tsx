'use client';
import { downloadFormSubmissionsAsCSV } from '@/features/payload-cms/payload-cms/components/form-submissions-download';
import type { Config } from '@/features/payload-cms/payload-types';
import type { StaticTranslationString } from '@/types/types';
import { useDocumentInfo, useLocale } from '@payloadcms/ui';
import React, { useCallback } from 'react';

const downloadButtonName: StaticTranslationString = {
  en: 'Export Form Submissions as CSV',
  de: 'Formular-Antworten als CSV exportieren',
  fr: 'Exporter les soumissions de formulaire en CSV',
};

export const FormExportButton: React.FC = () => {
  const { id } = useDocumentInfo();
  const { code } = useLocale() as { code: Config['locale'] };

  const downloadCSV = useCallback(() => {
    if (id === undefined) {
      console.error('No form ID available for export.');
      return;
    }

    downloadFormSubmissionsAsCSV(id.toString())
      // do some magic to download the CSV file
      .then((csvContent) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `form-submissions-${id}.csv`);
        link.style.visibility = 'hidden';
        document.body.append(link);
        link.click();
        link.remove();
      })
      .catch(console.error);
  }, [id]);

  if (id === undefined) {
    return <></>;
  }

  return (
    <button
      className="my-8 cursor-pointer rounded border border-solid border-green-300 bg-green-200 px-4 py-2 text-green-900 hover:bg-green-300 dark:bg-green-700 dark:text-green-100 hover:dark:bg-green-800"
      onClick={downloadCSV}
    >
      {downloadButtonName[code]}
    </button>
  );
};
