'use client';
import {
  downloadFormSubmissionsAsCSV,
  downloadFormSubmissionsAsExcel,
} from '@/features/payload-cms/payload-cms/components/form-submissions-download';
import type { Config } from '@/features/payload-cms/payload-types';
import type { StaticTranslationString } from '@/types/types';
import { useDocumentInfo, useLocale } from '@payloadcms/ui';
import React, { useCallback } from 'react';

const downloadButtonName: StaticTranslationString = {
  en: 'Export Form Submissions as CSV',
  de: 'Formular-Antworten als CSV exportieren',
  fr: 'Exporter les soumissions de formulaire en CSV',
};

const downloadExcelButtonName: StaticTranslationString = {
  en: 'Export Form Submissions as Excel',
  de: 'Formular-Antworten als Excel exportieren',
  fr: 'Exporter les soumissions de formulaire en Excel',
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

  const downloadExcel = useCallback(() => {
    if (id === undefined) {
      console.error('No form ID available for export.');
      return;
    }

    downloadFormSubmissionsAsExcel(id.toString())
      // do some magic to download the Excel file
      .then((base64Content) => {
        const byteCharacters = atob(base64Content);
        const byteNumbers: number[] = Array.from({ length: byteCharacters.length });
        for (let index = 0; index < byteCharacters.length; index++) {
          byteNumbers[index] = byteCharacters.codePointAt(index) ?? 0;
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `form-submissions-${id}.xlsx`);
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
    <div className="flex gap-4">
      <button
        type="button"
        className="my-8 cursor-pointer rounded border border-solid border-green-300 bg-green-200 px-4 py-2 text-green-900 hover:bg-green-300 dark:bg-green-700 dark:text-green-100 hover:dark:bg-green-800"
        onClick={downloadCSV}
      >
        {downloadButtonName[code]}
      </button>
      <button
        type="button"
        className="my-8 cursor-pointer rounded border border-solid border-green-300 bg-green-200 px-4 py-2 text-green-900 hover:bg-green-300 dark:bg-green-700 dark:text-green-100 hover:dark:bg-green-800"
        onClick={downloadExcel}
      >
        {downloadExcelButtonName[code]}
      </button>
    </div>
  );
};
