import { DashboardStatCard } from '@/features/payload-cms/payload-cms/widgets/dashboard-stat-card';
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
    <DashboardStatCard
      title={title[locale as Locale]}
      stats={[
        { value: sentCount, label: labels.sent[locale as Locale] },
        { value: errorCount, label: labels.errors[locale as Locale], isAlert: errorCount > 0 },
      ]}
    />
  );
}
