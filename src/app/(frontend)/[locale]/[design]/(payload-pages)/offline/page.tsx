import { OfflineLogo } from '@/components/ui/offline-logo';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { ParagraphText } from '@/components/ui/typography/paragraph-text';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { Metadata } from 'next';
import type React from 'react';

const metadataTitle: StaticTranslationString = {
  en: "You're Offline",
  de: 'Sie sind offline',
  fr: 'Vous êtes hors ligne',
};

const metadataDescription: StaticTranslationString = {
  en: 'No internet connection detected.',
  de: 'Keine Internetverbindung erkannt.',
  fr: 'Aucune connexion Internet détectée.',
};

const offlineHeadline: StaticTranslationString = {
  en: "You're Offline",
  de: 'Sie sind offline',
  fr: 'Vous êtes hors ligne',
};

const offlineLongText: StaticTranslationString = {
  en: "It looks like you've lost your internet connection. Please check your network settings or try again later.",
  de: 'Es sieht so aus, als hätten Sie Ihre Internetverbindung verloren. Bitte überprüfen Sie Ihre Netzwerkeinstellungen oder versuchen Sie es später erneut.',
  fr: 'Il semble que vous ayez perdu votre connexion Internet. Veuillez vérifier vos paramètres réseau ou réessayer plus tard.',
};

interface Properties {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: Properties): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: metadataTitle[locale],
    description: metadataDescription[locale],
  };
}

const OfflinePage: React.FC<Properties> = async ({ params }) => {
  const { locale } = await params;

  return (
    <div className="bg-white">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-16">
            <OfflineLogo />
          </div>

          <HeadlineH1>{offlineHeadline[locale]}</HeadlineH1>

          <div className="mt-4 mb-8">
            <ParagraphText className="text-center">{offlineLongText[locale]}</ParagraphText>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflinePage;
