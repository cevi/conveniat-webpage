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

  const sentCountResponse = await payload.count({
    collection: 'outgoing-emails',
    where: {
      createdAt: { greater_than: sevenDaysAgo.toISOString() },
      deliveryStatus: { equals: 'success' },
    },
  });

  const errorCountResponse = await payload.count({
    collection: 'outgoing-emails',
    where: {
      createdAt: { greater_than: sevenDaysAgo.toISOString() },
      deliveryStatus: { equals: 'error' },
    },
  });

  const sentCount = sentCountResponse.totalDocs;
  const errorCount = errorCountResponse.totalDocs;

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
