import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { ShiftsComponent } from '@/features/schedule/components/shifts-component';
import type { StaticTranslationString } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import type React from 'react';

const pageTitle: StaticTranslationString = {
  en: 'Helper Shifts',
  de: 'Schichteinsätze',
  fr: 'Services de helpers',
};

const HelperPortalPage: React.FC = async () => {
  const locale = await getLocaleFromCookies();

  return (
    <>
      <SetDynamicPageTitle newTitle={pageTitle[locale]} />
      <ShiftsComponent locale={locale} />
    </>
  );
};

export default HelperPortalPage;
