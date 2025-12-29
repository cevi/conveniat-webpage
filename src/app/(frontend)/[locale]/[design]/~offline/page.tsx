import type { Locale, StaticTranslationString } from '@/types/types';
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
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="max-w-lg text-center">
          <div className="mb-8 flex justify-center">
            <WifiOff size={96} className="text-slate-500" strokeWidth={1.5} />
          </div>
          <h1 className="mb-4 font-['Montserrat'] text-3xl font-bold text-slate-100">
            {offlineTitle[locale]}
          </h1>
          <p className="leading-relaxed text-slate-400">{offlineMessage[locale]}</p>
        </div>
      </div>
    </>
  );
}

export const generateStaticParams = (): { locale: Locale; design: DesignCodes }[] => {
  // Offline page is only used in app mode, so we only generate for APP_DESIGN
  const designs: DesignCodes[] = [DesignCodes.APP_DESIGN];
  const locales: Locale[] = ['de', 'fr', 'en'];

  return designs.flatMap((design) => locales.map((locale) => ({ locale, design })));
};
