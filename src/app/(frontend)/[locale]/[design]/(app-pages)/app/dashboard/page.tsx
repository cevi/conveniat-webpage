import { DashboardAppFeaturesSkeleton } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-app-features-skeleton';
import { DashboardAppFeaturesWrapper } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-app-features-wrapper';
import { DashboardUpcomingEventsSkeleton } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-upcoming-events-skeleton';
import { DashboardUpcomingEventsWrapper } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-upcoming-events-wrapper';
import { SafeErrorBoundary } from '@/components/error-boundary/safe-error-boundary';
import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';
import { Suspense } from 'react';

const dashboardTitle: StaticTranslationString = {
  en: 'Dashboard',
  de: 'Dashboard',
  fr: 'Tableau de bord',
};

const Dashboard: React.FC<{
  params: Promise<{ locale: Locale }>;
}> = async ({ params }) => {
  const { locale } = await params;

  return (
    <>
      <SetDynamicPageTitle newTitle={dashboardTitle[locale]} />
      <section className="container mx-auto mt-8 py-6">
        <article className="mx-auto w-full max-w-2xl space-y-6 px-8">
          {/* App Features Section (Streamed — fetches feature flags from DB) */}
          <SafeErrorBoundary fallback={<></>}>
            <Suspense fallback={<DashboardAppFeaturesSkeleton locale={locale} />}>
              <DashboardAppFeaturesWrapper locale={locale} />
            </Suspense>
          </SafeErrorBoundary>

          {/* Upcoming Program Elements Section (Streamed) */}
          <SafeErrorBoundary fallback={<></>}>
            <Suspense fallback={<DashboardUpcomingEventsSkeleton locale={locale} />}>
              <DashboardUpcomingEventsWrapper locale={locale} />
            </Suspense>
          </SafeErrorBoundary>
        </article>
      </section>
    </>
  );
};

export default Dashboard;
