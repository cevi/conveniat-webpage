import type { Locale, StaticTranslationString } from '@/types/types';
import { WifiOff } from 'lucide-react';
import type React from 'react';

const noInternetTitle: StaticTranslationString = {
  de: 'Keine Internetverbindung',
  en: 'No Internet Connection',
  fr: 'Pas de connexion Internet',
};

const noInternetDescription: StaticTranslationString = {
  de: 'Du bist offline und hast noch keine Inhalte heruntergeladen. Bitte stelle eine Verbindung zum Internet her, um fortzufahren.',
  en: "You are offline and haven't downloaded any content yet. Please connect to the internet to proceed.",
  fr: "Vous êtes hors ligne et n'avez pas encore téléchargé de contenu. Veuillez vous connecter à Internet pour continuer.",
};

const tryAgainButton: StaticTranslationString = {
  de: 'Seite neu laden',
  en: 'Reload Page',
  fr: 'Recharger la page',
};

interface NoInternetComponentProperties {
  locale: Locale;
}

export const NoInternetComponent: React.FC<NoInternetComponentProperties> = ({ locale }) => {
  return (
    <div className="flex flex-col items-center gap-6 p-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
        <WifiOff className="h-10 w-10 text-gray-500" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-gray-800">{noInternetTitle[locale]}</h2>
        <p className="text-balance text-gray-600">{noInternetDescription[locale]}</p>
      </div>

      <button
        onClick={() => globalThis.location.reload()}
        className="font-heading w-full transform cursor-pointer rounded-[8px] bg-gray-800 px-8 py-3 text-center text-lg leading-normal font-bold text-white shadow-md duration-100 hover:scale-[1.02] hover:bg-gray-700 active:scale-[0.98]"
      >
        {tryAgainButton[locale]}
      </button>
    </div>
  );
};
