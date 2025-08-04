import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { StaticTranslationString } from '@/types/types';
import { auth } from '@/utils/auth-helpers';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';

const settingsTitle: StaticTranslationString = {
  de: 'Einstellungen',
  en: 'Settings',
  fr: 'Paramètres',
};

const settingsInfoText: StaticTranslationString = {
  de: 'Einstellungen für die App',
  en: 'Settings for the app',
  fr: "Paramètres pour l'app",
};

const notAvailable: StaticTranslationString = {
    de: 'nicht verfügbar',
    en: 'not available',
    fr: '',
};

const Settings: React.FC = async () => {
  const locale = await getLocaleFromCookies();
  const session = await auth();
  const user = session?.user as HitobitoNextAuthUser | undefined;

  return (
    <>
      <SetDynamicPageTitle newTitle={settingsTitle[locale]} />
      <section className="container mx-auto my-8 px-4 py-8 md:py-12">
        <article className="mx-auto w-full max-w-2xl space-y-10">
          <div>
            <HeadlineH1>{settingsTitle[locale]}</HeadlineH1>
            <p className="mt-2 text-gray-700">{settingsInfoText[locale]}</p>
          </div>
          <div>
            <p className="mt-2 text-gray-700">Hof: {user?.hof ?? notAvailable[locale]}</p>
            <p className="mt-2 text-gray-700">Quartier: {user?.quartier ?? notAvailable[locale]}</p>
          </div>
        </article>
      </section>
    </>
  );
};

export default Settings;
