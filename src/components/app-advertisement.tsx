import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';

const appAdvertisementTextPart1: Record<'map' | 'chat', StaticTranslationString> = {
  map: {
    en: 'This map is part of the',
    de: 'Diese Karte ist Teil der',
    fr: 'Cette carte fait partie de la',
  },
  chat: {
    en: 'This chat is part of the',
    de: 'Dieser Chat ist Teil der',
    fr: 'Cette conversation fait partie de la',
  },
};

const appAdvertisementTextPart2: StaticTranslationString = {
  de: 'Lade sie herunter für eine bessere Erfahrung!',
  en: 'Download it for a better experience!',
  fr: 'Téléchargez-la pour une meilleure expérience !',
};

export const AppAdvertisement: React.FC<{
  locale: Locale;
  type?: 'map' | 'chat';
}> = ({ locale, type = 'map' }) => {
  return (
    <div className="fixed bottom-0 left-0 z-40 flex h-20 w-dvw items-center justify-center border-t-2 border-gray-200 bg-[#f8fafc] px-4 text-center xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <p className="text-sm text-gray-600">
        {appAdvertisementTextPart1[type][locale]} <strong>conveniat27 App</strong>.
        <br />
        {appAdvertisementTextPart2[locale]}
      </p>
    </div>
  );
};
