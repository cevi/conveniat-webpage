import { DashboardStatCard } from '@/features/payload-cms/payload-cms/widgets/dashboard-stat-card';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { WidgetServerProps } from 'payload';

const title: StaticTranslationString = {
  en: 'User Count',
  de: 'Anzahl Benutzer',
  fr: 'Nombre d’utilisateurs',
};

export default async function UserCounterWidget({
  req,
}: WidgetServerProps): Promise<React.ReactElement> {
  const { payload, locale } = req;
  const users = await payload.count({ collection: 'users' });

  return <DashboardStatCard title={title[locale as Locale]} stats={[{ value: users.totalDocs }]} />;
}
