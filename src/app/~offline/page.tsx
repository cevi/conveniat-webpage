import { AppShell } from '@/app/app-shell';
import { FooterComponent } from '@/components/footer/footer-component';
import { HideFooterProvider } from '@/components/footer/hide-footer-context';
import { HeaderComponent } from '@/components/header/header-component';
import type { Locale, StaticTranslationString } from '@/types/types';
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

export default function OfflinePage(): React.ReactNode {
  // Default to 'de' for the offline fallback page
  const localeSelection: Locale = 'de';
  // For the offline fallback, we assume app design as most critical features are there
  const inAppDesign = true;

  const localePromise = Promise.resolve(localeSelection);
  const inAppDesignPromise = Promise.resolve(inAppDesign);

  return (
    <HideFooterProvider>
      <AppShell
        header={<HeaderComponent locale={localeSelection} inAppDesign={inAppDesign} />}
        footer={<FooterComponent locale={localePromise} inAppDesign={inAppDesignPromise} />}
        inAppDesign={inAppDesign}
      >
        <title>{offlineTitle[localeSelection]}</title>
        <div className="flex min-h-[50vh] items-center justify-center p-4">
          <div className="max-w-lg text-center">
            <div className="mb-8 flex justify-center">
              <WifiOff size={96} className="text-slate-500" strokeWidth={1.5} />
            </div>
            <h1 className="mb-4 font-['Montserrat'] text-3xl font-bold text-slate-100">
              {offlineTitle[localeSelection]}
            </h1>
            <p className="leading-relaxed text-slate-400">{offlineMessage[localeSelection]}</p>
          </div>
        </div>
      </AppShell>
    </HideFooterProvider>
  );
}
