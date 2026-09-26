'use client';

import { ReportDownloadCard } from '@/features/billing/components/report-download-card';
import type React from 'react';

/** Downloads the registration report (PDF) the weekly mail attaches. */
export const WeeklyReportDownloadButton: React.FC = () => (
  <ReportDownloadCard
    url="/api/confidential/billing/weekly-report-pdf"
    fallbackFilename="anmeldestand.pdf"
    title={{
      de: 'Bericht jetzt erstellen',
      en: 'Generate the report now',
      fr: 'Générer le rapport maintenant',
    }}
    description={{
      de: 'Erstellt denselben Anmeldestand-Bericht (PDF), den der Wochenbericht per E-Mail verschickt — mit den Anmeldungen von jetzt. Der Bericht wird nur heruntergeladen: es wird keine E-Mail versendet und der Zeitplan für den nächsten Versand bleibt unverändert.',
      en: 'Builds the same registration report (PDF) the weekly mail attaches, from the registrations as they stand right now. It is only downloaded: no email is sent and the schedule for the next send is untouched.',
      fr: "Génère le même rapport d'inscriptions (PDF) que celui joint à l'e-mail hebdomadaire, à partir des inscriptions actuelles. Il est uniquement téléchargé : aucun e-mail n'est envoyé et la planification du prochain envoi reste inchangée.",
    }}
    downloadLabel={{
      de: 'Bericht als PDF herunterladen',
      en: 'Download the report as PDF',
      fr: 'Télécharger le rapport en PDF',
    }}
    generatingLabel={{
      de: 'Bericht wird erstellt...',
      en: 'Generating the report...',
      fr: 'Génération du rapport...',
    }}
    errorMessage={{
      de: 'Der Bericht konnte nicht erstellt werden.',
      en: 'The report could not be generated.',
      fr: "Le rapport n'a pas pu être généré.",
    }}
  />
);

export default WeeklyReportDownloadButton;
