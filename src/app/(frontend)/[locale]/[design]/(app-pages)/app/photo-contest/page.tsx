import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { PhotoContestView } from '@/features/photo-contest/components/photo-contest-view';
import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';

const pageTitle: StaticTranslationString = {
  en: 'Photo Contest',
  de: 'Foto-Wettbewerb',
  fr: 'Concours Photo',
};

const PhotoContestPage: React.FC<{ params: Promise<{ locale: Locale }> }> = async ({ params }) => {
  const { locale } = await params;

  return (
    <>
      <SetDynamicPageTitle newTitle={pageTitle[locale]} />
      <PhotoContestView />
    </>
  );
};

export default PhotoContestPage;
