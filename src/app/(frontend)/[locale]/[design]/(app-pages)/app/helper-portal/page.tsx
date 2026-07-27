import HelperPortalLoading from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/helper-portal/loading';
import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { ShiftsComponent } from '@/features/schedule/components/shifts-component';
import type { StaticTranslationString } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import type React from 'react';
import { Suspense } from 'react';

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
      <Suspense fallback={<HelperPortalLoading />}>
        <ShiftsComponent locale={locale} />
      </Suspense>
    </>
  );
};

export default HelperPortalPage;
