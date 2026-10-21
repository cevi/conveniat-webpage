import { Button } from '@/components/ui/buttons/button';
import { IconTile } from '@/components/ui/icon-tile';
import { OnboardingStepScreen } from '@/features/onboarding/components/onboarding-step';
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

/** Shown offline when nothing is cached yet, so the app has nothing to start from. */
export const NoInternetComponent: React.FC<NoInternetComponentProperties> = ({ locale }) => {
  return (
    <OnboardingStepScreen
      visual={<IconTile icon={WifiOff} size="lg" />}
      title={noInternetTitle[locale]}
      description={noInternetDescription[locale]}
      actions={
        <Button variant="primary" size="touch" onClick={() => globalThis.location.reload()}>
          {tryAgainButton[locale]}
        </Button>
      }
    />
  );
};
