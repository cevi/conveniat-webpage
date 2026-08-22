'use client';

import type { Config } from '@/features/payload-cms/payload-types';
import type { StaticTranslationString } from '@/types/types';
import { useLocale } from '@payloadcms/ui';
import type React from 'react';

const exportButtonLabel: StaticTranslationString = {
  en: 'Export helper hours as Excel',
  de: 'Helfenden-Stunden als Excel exportieren',
  fr: 'Exporter les heures des helpers en Excel',
};

const exportDescription: StaticTranslationString = {
  en: 'One row per helper enrolled in at least one shift: name, Ceviname, number of shifts, total hours and the titles of those shifts.',
  de: 'Eine Zeile pro Helfende:r mit mindestens einem Schichteinsatz: Name, Ceviname, Anzahl Schichteinsätze, Stundentotal und die Titel dieser Schichteinsätze.',
  fr: 'Une ligne par helper inscrit à au moins un service : nom, Ceviname, nombre de services, total des heures et les titres de ces services.',
};

/**
 * List-view action for the helper shifts collection that downloads the participation report:
 * how many shifts and hours every helper covered, across all shifts.
 */
export const HelperShiftParticipationExport: React.FC = () => {
  const { code } = useLocale() as { code: Config['locale'] };

  return (
    <div className="my-6 flex flex-col items-start gap-2">
      <a
        href={`/api/helper-shifts/participation-export?locale=${code}`}
        className="cursor-pointer rounded border border-solid border-green-300 bg-green-200 px-4 py-2 text-green-900 no-underline hover:bg-green-300 dark:bg-green-700 dark:text-green-100 hover:dark:bg-green-800"
      >
        {exportButtonLabel[code]}
      </a>
      <p className="m-0 text-sm opacity-70">{exportDescription[code]}</p>
    </div>
  );
};
