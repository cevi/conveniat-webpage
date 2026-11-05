import HelperPortalLoading from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/helper-portal/loading';
import { ShiftsPageContent } from '@/features/schedule/components/shifts-page-content';
import { getRouteLocale } from '@/utils/get-route-locale';
import type React from 'react';
import { Suspense } from 'react';

const HelperPortalPage: React.FC = async () => {
  const locale = await getRouteLocale();

  return (
    <Suspense fallback={<HelperPortalLoading />}>
      <ShiftsPageContent locale={locale} />
    </Suspense>
  );
};

export default HelperPortalPage;
