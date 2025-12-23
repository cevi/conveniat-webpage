'use client';

import '@/app/globals.scss';
import type { Locale, StaticTranslationString } from '@/types/types';
import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

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

function getPreferredLocale(): Locale {
    if (typeof navigator === 'undefined') return 'de';

    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('de')) return 'de';
    if (browserLang.startsWith('fr')) return 'fr';
    return 'en';
}

export default function OfflinePage() {
    const [locale, setLocale] = useState<Locale>('de');

    useEffect(() => {
        setLocale(getPreferredLocale());
    }, []);

    return (
        <html lang={locale}>
            <head>
                <title>{offlineTitle[locale]}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </head>
            <body className="m-0 min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 font-sans">
                <div className="flex h-screen items-center justify-center p-4">
                    <div className="max-w-lg text-center">
                        <div className="mb-8 flex justify-center">
                            <WifiOff size={96} className="text-[#47564C]" strokeWidth={1.5} />
                        </div>
                        <h1 className="mb-4 text-3xl font-bold text-slate-100">{offlineTitle[locale]}</h1>
                        <p className="leading-relaxed text-slate-400">{offlineMessage[locale]}</p>
                    </div>
                </div>
            </body>
        </html>
    );
}
