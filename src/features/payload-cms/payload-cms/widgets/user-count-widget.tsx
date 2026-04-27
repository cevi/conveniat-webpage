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

  return (
    <div className="card">
      <h3>{title[locale as Locale]}</h3>
      <p className="font-bold">{users.totalDocs}</p>
    </div>
  );
}
