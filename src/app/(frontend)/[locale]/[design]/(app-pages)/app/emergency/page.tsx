import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { EmergencyComponent } from '@/features/emergency/components/emergency-component';
import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';

// the same words as the tab that opens it
const pageTitle: StaticTranslationString = {
  de: 'Notfall',
  en: 'Emergency',
  fr: 'Urgence',
};

const EmergencyPage: React.FC<{ params: Promise<{ locale: Locale }> }> = async ({ params }) => {
  const { locale } = await params;

  return (
    <>
      <SetDynamicPageTitle newTitle={pageTitle[locale]} />
      <EmergencyComponent />
    </>
  );
};

export default EmergencyPage;
