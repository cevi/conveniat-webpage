import { OfflineLogo } from '@/components/ui/offline-logo';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { ParagraphText } from '@/components/ui/typography/paragraph-text';
import type { Locale, StaticTranslationString } from '@/types/types';
import { offlineLongTextTranslation, offlineTitleTranslation } from '@/utils/shared-translations';
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

          <HeadlineH1>{offlineTitleTranslation[locale]}</HeadlineH1>

          <div className="mt-4 mb-8">
            <ParagraphText className="text-center">
              {offlineLongTextTranslation[locale]}
            </ParagraphText>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflinePage;
