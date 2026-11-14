'use client';

import { ExcelExportLink } from '@/features/payload-cms/payload-cms/components/shared/excel-export-link';
import type { Config } from '@/features/payload-cms/payload-types';
import type { StaticTranslationString } from '@/types/types';
import { useLocale } from '@payloadcms/ui';
import type React from 'react';

const exportButtonLabel: StaticTranslationString = {
  en: 'Export shift lead hours as Excel',
  de: 'Schichtleitungs-Stunden als Excel exportieren',
  fr: 'Exporter les heures des responsables de service en Excel',
};

const exportDescription: StaticTranslationString = {
  en: 'A separate list of the shift leads: one row per person with name, Ceviname, email, number of shifts led, total hours and the titles of those shifts. Enrolled helpers are not part of this list.',
  de: 'Eine separate Liste der Schichtleitung: eine Zeile pro Person mit Name, Ceviname, E-Mail, Anzahl geleiteter Schichteinsätze, Stundentotal und den Titeln dieser Schichteinsätze. Angemeldete Helfende sind hier nicht enthalten.',
  fr: 'Une liste séparée des responsables de service : une ligne par personne avec nom, Ceviname, e-mail, nombre de services dirigés, total des heures et les titres de ces services. Les helpers inscrits ne figurent pas dans cette liste.',
};

/**
 * List-view action for the helper shifts collection that downloads the organiser report: how many
 * shifts and hours every organiser is responsible for, kept apart from the enrolled helpers.
 */
export const HelperShiftOrganiserExport: React.FC = () => {
  const { code } = useLocale() as { code: Config['locale'] };

  return (
    <div className="mb-6">
      <ExcelExportLink
        href={`/api/helper-shifts/organiser-export?locale=${code}`}
        label={exportButtonLabel[code]}
        description={exportDescription[code]}
      />
    </div>
  );
};
