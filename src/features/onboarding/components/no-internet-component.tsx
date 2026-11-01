import { Button } from '@/components/ui/buttons/button';
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
      <div className="bg-quiet flex h-20 w-20 items-center justify-center rounded-full">
        <WifiOff className="h-10 w-10 text-green-500" />
      </div>

      <div className="space-y-2">
        <h2 className="font-heading text-heading text-[17px] leading-snug font-bold">
          {noInternetTitle[locale]}
        </h2>
        <p className="text-[15px] leading-normal text-balance text-green-700">
          {noInternetDescription[locale]}
        </p>
      </div>

      <Button
        variant="primary"
        size="touch"
        className="w-full"
        onClick={() => globalThis.location.reload()}
      >
        {tryAgainButton[locale]}
      </Button>
    </div>
  );
};
