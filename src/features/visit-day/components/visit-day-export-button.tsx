'use client';

import { ReportDownloadCard } from '@/features/payload-cms/payload-cms/components/shared/report-download-card';
import type React from 'react';

/** Downloads every Besuchstag visitor as Excel, one row per person with their visitor id. */
export const VisitDayExportButton: React.FC = () => (
  <ReportDownloadCard
    url="/api/globals/visit-day/export-xlsx"
    fallbackFilename="besuchstag.xlsx"
    title={{
      de: 'Liste der Besuchenden',
      en: 'List of visitors',
      fr: 'Liste des visiteurs',
    }}
    description={{
      de: 'Alle angemeldeten Personen, eine Zeile pro Person mit ihrer Besucher-ID, dem Tag, dem Hof und den Antworten der Anmeldung. Antworten, deren Name auf _1 oder _2 endet, gehören zur ersten oder zweiten Person.',
      en: 'Everyone registered, one row per person with their visitor id, the day, the Hof and the answers of the registration. Answers whose name ends in _1 or _2 belong to the first or second person.',
      fr: 'Toutes les personnes inscrites, une ligne par personne avec son identifiant de visiteur, le jour, le Hof et les réponses de l’inscription. Les réponses dont le nom finit par _1 ou _2 appartiennent à la première ou à la deuxième personne.',
    }}
    downloadLabel={{
      de: 'Als Excel herunterladen',
      en: 'Download as Excel',
      fr: 'Télécharger en Excel',
    }}
    generatingLabel={{
      de: 'Liste wird erstellt...',
      en: 'Generating the list...',
      fr: 'Génération de la liste...',
    }}
    errorMessage={{
      de: 'Die Liste konnte nicht erstellt werden.',
      en: 'The list could not be generated.',
      fr: "La liste n'a pas pu être générée.",
    }}
  />
);

export default VisitDayExportButton;
