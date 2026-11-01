import HelperPortalLoading from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/helper-portal/loading';
import { ShiftsPageContent } from '@/features/schedule/components/shifts-page-content';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import type React from 'react';
import { Suspense } from 'react';

const HelperPortalPage: React.FC = async () => {
  const locale = await getLocaleFromCookies();

  return (
    <Suspense fallback={<HelperPortalLoading />}>
      <ShiftsPageContent locale={locale} />
    </Suspense>
  );
};

export default HelperPortalPage;
