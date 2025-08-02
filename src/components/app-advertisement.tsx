import type { StaticTranslationString } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import type React from 'react';

const appAdvertisementTextPart1: StaticTranslationString = {
  en: 'This map is part of the',
  de: 'Diese Karte ist Teil der',
  fr: 'Cette carte fait partie de la',
};

const appAdvertisementTextPart2: StaticTranslationString = {
  de: 'Lade sie herunter für eine bessere Erfahrung!',
  en: 'Download it for a better experience!',
  fr: 'Téléchargez-la pour une meilleure expérience !',
};

export const AppAdvertisement: React.FC = async () => {
  const locale = await getLocaleFromCookies();

  return (
    <div className="fixed right-0 bottom-0 left-0 z-0 bg-white p-4 text-center shadow-lg">
      <p className="text-sm text-gray-600">
        {appAdvertisementTextPart1[locale]} <strong>conveniat27 App</strong>.
        <br />
        {appAdvertisementTextPart2[locale]}
      </p>
    </div>
  );
};
