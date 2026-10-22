import { ReloadWhenOnline } from '@/app/(frontend)/[locale]/[design]/~offline/reload-when-online';
import { EmptyState } from '@/components/ui/empty-state';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import { WifiOff } from 'lucide-react';
import React from 'react';

const offlineTitle: StaticTranslationString = {
  de: 'Du bist offline',
  en: "You're offline",
  fr: 'Vous êtes hors ligne',
};

const offlineMessage: StaticTranslationString = {
  de: 'Es sieht so aus, als hättest du deine Internetverbindung verloren. Bitte überprüfe deine Netzwerkeinstellungen oder versuche es später erneut.',
  en: "It looks like you've lost your internet connection. Please check your network settings or try again later.",
  fr: 'Il semble que vous ayez perdu votre connexion Internet. Veuillez vérifier vos paramètres réseau ou réessayer plus tard.',
};

interface OfflinePageProperties {
  params: Promise<{
    locale: Locale;
    design: DesignCodes;
  }>;
}

export default async function OfflinePage({
  params,
}: OfflinePageProperties): Promise<React.ReactNode> {
  const { locale } = await params;

  return (
    <>
      <title>{offlineTitle[locale]}</title>
      <ReloadWhenOnline />
      <main className="flex min-h-[50vh] items-center justify-center p-4">
        <EmptyState
          icon={WifiOff}
          title={offlineTitle[locale]}
          description={offlineMessage[locale]}
          className="w-full max-w-md"
        />
      </main>
    </>
  );
}

export const generateStaticParams = (): { locale: Locale; design: DesignCodes }[] => {
  const designs: DesignCodes[] = [DesignCodes.APP_DESIGN, DesignCodes.WEB_DESIGN];
  const locales = i18nConfig.locales as Locale[];

  return designs.flatMap((design) => locales.map((locale) => ({ locale, design })));
};
