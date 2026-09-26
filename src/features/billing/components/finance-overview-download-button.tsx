'use client';

import { ReportDownloadCard } from '@/features/billing/components/report-download-card';
import type React from 'react';

/**
 * Downloads the bill overview (Excel) the weekly mail sends to the finance recipients.
 *
 * It goes through the same endpoint as the export in the bill participants list, which
 * builds the workbook the finance mail attaches.
 */
export const FinanceOverviewDownloadButton: React.FC = () => (
  <ReportDownloadCard
    url="/api/confidential/billing/export-xlsx"
    fallbackFilename="rechnungsuebersicht.xlsx"
    title={{
      de: 'Rechnungsübersicht jetzt erstellen',
      en: 'Generate the bill overview now',
      fr: 'Générer la synthèse des factures maintenant',
    }}
    description={{
      de: 'Erstellt dieselbe Rechnungsübersicht (Excel), welche die Finanz-E-Mail-Empfänger wöchentlich erhalten — mit den Rechnungen von jetzt. Die Datei wird nur heruntergeladen: es wird keine E-Mail versendet und der Zeitplan für den nächsten Versand bleibt unverändert.',
      en: 'Builds the same bill overview (Excel) the finance recipients get every week, from the bills as they stand right now. It is only downloaded: no email is sent and the schedule for the next send is untouched.',
      fr: "Génère la même synthèse des factures (Excel) que les destinataires finances reçoivent chaque semaine, à partir des factures actuelles. Elle est uniquement téléchargée : aucun e-mail n'est envoyé et la planification du prochain envoi reste inchangée.",
    }}
    downloadLabel={{
      de: 'Rechnungsübersicht als Excel herunterladen',
      en: 'Download the bill overview as Excel',
      fr: 'Télécharger la synthèse des factures en Excel',
    }}
    generatingLabel={{
      de: 'Rechnungsübersicht wird erstellt...',
      en: 'Generating the bill overview...',
      fr: 'Génération de la synthèse des factures...',
    }}
    errorMessage={{
      de: 'Die Rechnungsübersicht konnte nicht erstellt werden.',
      en: 'The bill overview could not be generated.',
      fr: "La synthèse des factures n'a pas pu être générée.",
    }}
  />
);

export default FinanceOverviewDownloadButton;
