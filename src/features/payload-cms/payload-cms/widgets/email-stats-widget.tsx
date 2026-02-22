import type { Locale, StaticTranslationString } from '@/types/types';
import type { WidgetServerProps } from 'payload';

const title: StaticTranslationString = {
  en: 'Email Stats (Last 7 Days)',
  de: 'Email Statistiken (Letzte 7 Tage)',
  fr: 'Statistiques des e-mails (7 derniers jours)',
};

const labels = {
  sent: {
    en: 'Sent Successfully',
    de: 'Erfolgreich gesendet',
    fr: 'Envoyé avec succès',
  },
  errors: {
    en: 'Bounces / Errors',
    de: 'Fehler / Unzustellbar',
    fr: 'Erreurs / Rebond',
  },
};

export default async function EmailStatsWidget({
  req,
}: WidgetServerProps): Promise<React.ReactElement> {
  const { payload, locale } = req;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { docs } = await payload.find({
    collection: 'form-submissions',
    where: {
      createdAt: { greater_than: sevenDaysAgo.toISOString() },
    },
    limit: 1000,
    depth: 0,
  });

  let sentCount = 0;
  let errorCount = 0;

  for (const document_ of docs) {
    if (Array.isArray(document_.smtpResults)) {
      // Determine final status of each email dispatch recorded
      // Note: A single form submission can have multiple email dispatches
      for (const result of document_.smtpResults) {
        if (result === null || typeof result !== 'object') continue;

        const r = result as Record<string, unknown>;
        let hasError = false;

        if (r['success'] === false) hasError = true;
        if (typeof r['error'] === 'string' && r['error'].length > 0) hasError = true;
        if (r['bounceReport'] === true && r['success'] !== true) hasError = true;

        if (hasError) {
          errorCount++;
        } else if (r['success'] === true) {
          sentCount++;
        }
      }
    }
  }

  return (
    <div className="card">
      <h3 className="mb-4">{title[locale as Locale]}</h3>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between rounded bg-green-900/10 px-3 py-2 dark:bg-green-900/20">
          <span className="mr-2 text-sm">{labels.sent[locale as Locale]}</span>
          <span className="font-bold text-green-700 dark:text-green-500">{sentCount}</span>
        </div>
        <div className="flex items-center justify-between rounded bg-red-900/10 px-3 py-2 dark:bg-red-900/20">
          <span className="mr-2 text-sm">{labels.errors[locale as Locale]}</span>
          <span className="font-bold text-red-700 dark:text-red-500">{errorCount}</span>
        </div>
      </div>
    </div>
  );
}
