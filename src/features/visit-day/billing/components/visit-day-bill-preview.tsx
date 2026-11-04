'use client';

import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type { StaticTranslationString } from '@/types/types';
import { Button, useLocale, useTranslation } from '@payloadcms/ui';
import type React from 'react';
import { useState } from 'react';

const t = {
  explanation: {
    de: 'Eine Beispielrechnung für Maximilian Muster, 2 Personen mit Mittagessen am ersten Besuchstag, mit den gespeicherten Einstellungen. Sie erscheint in der Sprache, die oben unter «Locale» gewählt ist; nach dem Speichern aktualisieren.',
    en: 'A sample bill for Maximilian Muster, 2 persons with lunch on the first visiting day, from the saved settings. It shows in the language chosen under “Locale” above; refresh after saving.',
    fr: 'Une facture d’exemple pour Maximilian Muster, 2 personnes avec repas de midi le premier jour de visite, selon les réglages enregistrés. Elle s’affiche dans la langue choisie sous « Locale » en haut ; actualiser après l’enregistrement.',
  },
  refresh: { de: 'Aktualisieren', en: 'Refresh', fr: 'Actualiser' },
  title: { de: 'Vorschau der Rechnung', en: 'Bill preview', fr: 'Aperçu de la facture' },
} satisfies Record<string, StaticTranslationString>;

/**
 * The PDF preview tab of the Besuchstag bill settings: a sample bill rendered by the server,
 * in the content language the settings page is editing, so the French texts can be checked on
 * a French bill.
 */
export const VisitDayBillPreview: React.FC = () => {
  // the bill is in the language being edited, the words around it in the admin's own
  const contentLocale = resolveAdminLocale(useLocale().code);
  const uiLocale = resolveAdminLocale(useTranslation().i18n.language);
  const [version, setVersion] = useState(0);
  const source = `/api/visit-day-bills/preview-pdf?locale=${contentLocale}&v=${String(version)}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <p className="m-0 text-sm text-(--theme-elevation-600)">{t.explanation[uiLocale]}</p>
        <Button
          buttonStyle="secondary"
          size="small"
          margin={false}
          onClick={() => setVersion((previous) => previous + 1)}
        >
          {t.refresh[uiLocale]}
        </Button>
      </div>
      <iframe
        key={source}
        src={source}
        title={t.title[uiLocale]}
        className="h-[800px] w-full rounded border border-(--theme-elevation-150) bg-(--theme-elevation-50)"
      />
    </div>
  );
};
