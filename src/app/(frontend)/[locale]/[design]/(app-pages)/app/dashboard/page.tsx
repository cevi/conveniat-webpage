import { DashboardAppFeaturesSkeleton } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-app-features-skeleton';
import { DashboardLandingPageWrapper } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-landing-page-wrapper';
import { DashboardUpcomingEventsSkeleton } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-upcoming-events-skeleton';
import { DashboardUpcomingEventsWrapper } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-upcoming-events-wrapper';
import { SafeErrorBoundary } from '@/components/error-boundary/safe-error-boundary';
import { environmentVariables } from '@/config/environment-variables';
import { PresenceSlider } from '@/features/presence/components/presence-slider';
import type { Locale } from '@/types/types';
import type React from 'react';
import { Suspense } from 'react';

const Dashboard: React.FC<{
  params: Promise<{ locale: Locale }>;
}> = async ({ params }) => {
  const { locale } = await params;
  const showPresence = environmentVariables.FEATURE_ENABLE_PRESENCE_TRACKING;

  return (
    <>
      <section className="container mx-auto mt-8 py-6">
        <article className="mx-auto w-full max-w-2xl space-y-6 px-8">
          {/* Presence Status Slider */}
          {showPresence && (
            <SafeErrorBoundary fallback={<></>}>
              <Suspense
                fallback={
                  <div className="mx-auto h-[120px] w-full max-w-md animate-pulse rounded-2xl bg-gray-100" />
                }
              >
                <PresenceSlider />
              </Suspense>
            </SafeErrorBoundary>
          )}

          {/* Landing page section: title, welcome content, action cards (Streamed) */}
          <SafeErrorBoundary fallback={<></>}>
            <Suspense fallback={<DashboardAppFeaturesSkeleton locale={locale} />}>
              <DashboardLandingPageWrapper locale={locale} />
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
