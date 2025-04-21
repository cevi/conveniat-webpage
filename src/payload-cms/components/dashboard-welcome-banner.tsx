import React from 'react';
import type { StaticTranslationString } from '@/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';

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

const DashboardWelcomeBanner: React.FC = async () => {
  const locale = await getLocaleFromCookies();

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-conveniat-green">
        {welcomeMessageTitle[locale]}
      </h1>
      <p className="mt-2 text-lg">{welcomeMessage[locale]}</p>
    </div>
  );
};

export default DashboardWelcomeBanner;
