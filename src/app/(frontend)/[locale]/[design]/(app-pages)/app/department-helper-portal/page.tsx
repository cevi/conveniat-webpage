import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';

const helperShiftsFeatureTranslation: StaticTranslationString = {
  en: 'Helper Shifts',
  de: 'Schichteinsätze',
  fr: "Postes d'aide",
};

const DepartmentHelperPortalPage: React.FC<{ locale: Locale }> = ({ locale }) => {
  return (
    <>
      <SetDynamicPageTitle newTitle={helperShiftsFeatureTranslation[locale]} />
    </>
  );
};

export default DepartmentHelperPortalPage;
