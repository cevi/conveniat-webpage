'use client';

import { ReportDownloadCard } from '@/features/billing/components/report-download-card';
import type React from 'react';

/** Downloads the double payment report (PDF) the weekly finance mail attaches. */
export const DoublePaymentsDownloadButton: React.FC = () => (
  <ReportDownloadCard
    url="/api/confidential/billing/double-payments-pdf"
    fallbackFilename="doppelzahlungen.pdf"
    title={{
      de: 'Doppelzahlungen jetzt erstellen',
      en: 'Generate the double payments now',
      fr: 'Générer les doubles paiements maintenant',
    }}
    description={{
      de: 'Erstellt dieselbe Liste der Doppelzahlungen (PDF), welche die Finanz-E-Mail-Empfänger wöchentlich mit der Rechnungsübersicht erhalten: jede Rechnung, für die mehr bezahlt wurde, als sie verlangt, mit den Zahlungen dazu. Die Datei wird nur heruntergeladen: es wird keine E-Mail versendet.',
      en: 'Builds the same list of double payments (PDF) the finance recipients get every week with the bill overview: every bill paid more than it asks for, with its payments. It is only downloaded: no email is sent.',
      fr: "Génère la même liste des doubles paiements (PDF) que les destinataires finances reçoivent chaque semaine avec la synthèse des factures : chaque facture ayant reçu plus que son montant, avec ses paiements. Elle est uniquement téléchargée : aucun e-mail n'est envoyé.",
    }}
    downloadLabel={{
      de: 'Doppelzahlungen als PDF herunterladen',
      en: 'Download the double payments as PDF',
      fr: 'Télécharger les doubles paiements en PDF',
    }}
    generatingLabel={{
      de: 'Doppelzahlungen werden erstellt...',
      en: 'Generating the double payments...',
      fr: 'Génération des doubles paiements...',
    }}
    errorMessage={{
      de: 'Die Doppelzahlungen konnten nicht erstellt werden.',
      en: 'The double payments could not be generated.',
      fr: "Les doubles paiements n'ont pas pu être générés.",
    }}
  />
);

export default DoublePaymentsDownloadButton;
