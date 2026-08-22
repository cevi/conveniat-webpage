'use client';

import { ExcelExportLink } from '@/features/payload-cms/payload-cms/components/shared/excel-export-link';
import type { Config } from '@/features/payload-cms/payload-types';
import type { StaticTranslationString } from '@/types/types';
import { useLocale } from '@payloadcms/ui';
import type React from 'react';

const exportButtonLabel: StaticTranslationString = {
  en: 'Export organiser hours as Excel',
  de: 'Organisatoren-Stunden als Excel exportieren',
  fr: 'Exporter les heures des organisateurs en Excel',
};

const exportDescription: StaticTranslationString = {
  en: 'One row per organiser of a programme element: name, Ceviname, email, number of programme elements organised, total hours and the titles of those elements. Helper shift organisers are exported separately, from the helper shifts list.',
  de: 'Eine Zeile pro Organisator:in eines Programmblocks: Name, Ceviname, E-Mail, Anzahl organisierter Programmblöcke, Stundentotal und die Titel dieser Programmblöcke. Organisatoren von Schichteinsätzen werden separat über die Schichteinsätze-Liste exportiert.',
  fr: 'Une ligne par organisateur d’un élément de programme : nom, Ceviname, e-mail, nombre d’éléments organisés, total des heures et les titres de ces éléments. Les organisateurs des services de helpers sont exportés séparément, depuis la liste des services.',
};

/**
 * List-view action for the camp schedule entries that downloads the organiser report: how many
 * programme elements and hours every organiser is responsible for.
 */
export const CampScheduleOrganiserExport: React.FC = () => {
  const { code } = useLocale() as { code: Config['locale'] };

  return (
    <div className="my-6">
      <ExcelExportLink
        href={`/api/camp-schedule-entry/organiser-export?locale=${code}`}
        label={exportButtonLabel[code]}
        description={exportDescription[code]}
      />
    </div>
  );
};
