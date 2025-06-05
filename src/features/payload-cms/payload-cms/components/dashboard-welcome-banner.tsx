import build from '@/build';
import { environmentVariables } from '@/config/environment-variables';
import { resetServerData } from '@/features/payload-cms/payload-cms/initialization/deleting/reset-api';
import type { StaticTranslationString } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import type React from 'react';

const welcomeMessageTitle: StaticTranslationString = {
  de: 'conveniat27 CMS',
  en: 'conveniat27 CMS',
  fr: 'CMS du conveniat27',
};

const welcomeMessage: StaticTranslationString = {
  de: 'Hier kannst du alle Inhalte der Webseite verwalten und bearbeiten.',
  en: 'Here you can manage and edit all the content of the website.',
  fr: 'Ici, vous pouvez gérer et modifier tout le contenu du site web.',
};

const resetHandler = (): void => {
  resetServerData().catch(console.error);
};

const DashboardWelcomeBanner: React.FC = async () => {
  const locale = await getLocaleFromCookies();

  const isLocalhost = environmentVariables.APP_HOST_URL.includes('localhost');

  return (
    <div>
      <h1 className="text-conveniat-green text-3xl font-extrabold">
        {welcomeMessageTitle[locale]} - Version {build.version}
      </h1>
      <p className="mt-2 text-lg">{welcomeMessage[locale]}</p>
      {isLocalhost && (
        <button type="submit" onClick={resetHandler}>
          RESET
        </button>
      )}
    </div>
  );
};

export default DashboardWelcomeBanner;
