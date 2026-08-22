'use client';

import { ExcelExportLink } from '@/features/payload-cms/payload-cms/components/shared/excel-export-link';
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
  en: 'One row per helper enrolled in at least one shift: name, Ceviname, email, number of shifts, total hours and the titles of those shifts.',
  de: 'Eine Zeile pro Helfende:r mit mindestens einem Schichteinsatz: Name, Ceviname, E-Mail, Anzahl Schichteinsätze, Stundentotal und die Titel dieser Schichteinsätze.',
  fr: 'Une ligne par helper inscrit à au moins un service : nom, Ceviname, e-mail, nombre de services, total des heures et les titres de ces services.',
};

/**
 * List-view action for the helper shifts collection that downloads the participation report:
 * how many shifts and hours every helper covered, across all shifts.
 */
export const HelperShiftParticipationExport: React.FC = () => {
  const { code } = useLocale() as { code: Config['locale'] };

  return (
    <div className="mt-6 mb-2">
      <ExcelExportLink
        href={`/api/helper-shifts/participation-export?locale=${code}`}
        label={exportButtonLabel[code]}
        description={exportDescription[code]}
      />
    </div>
  );
};
