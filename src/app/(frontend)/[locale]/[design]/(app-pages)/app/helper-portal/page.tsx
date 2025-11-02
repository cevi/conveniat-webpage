import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import type { StaticTranslationString } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import type React from 'react';

const helperShiftsFeatureTranslation: StaticTranslationString = {
  en: 'Helper Shifts',
  de: 'Schichteinsätze',
  fr: "Postes d'aide",
};

const HelperPortalPage: React.FC = async () => {
  const locale = await getLocaleFromCookies();

  return (
    <>
      <SetDynamicPageTitle newTitle={helperShiftsFeatureTranslation[locale]} />
    </>
  );
};

export default HelperPortalPage;
