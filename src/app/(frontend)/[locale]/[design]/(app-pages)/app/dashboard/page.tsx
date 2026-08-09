import { DashboardContentErrorBoundary } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-content-error-boundary';
import { DashboardLandingSection } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-landing-section';
import { DashboardUpcomingEvents } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-upcoming-events';
import { DashboardWelcomeContent } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-welcome-content';
import { SafeErrorBoundary } from '@/components/error-boundary/safe-error-boundary';
import { environmentVariables } from '@/config/environment-variables';
import { PresenceSlider } from '@/features/presence/components/presence-slider';
import type { Locale } from '@/types/types';
import type React from 'react';
import { Suspense } from 'react';

/**
 * The dashboard content is rendered by client components backed by the
 * persisted react-query cache (see `DashboardLandingSection` and
 * `DashboardUpcomingEvents`). This keeps the page shell static, so navigating
 * back to the dashboard renders the previously loaded content immediately
 * instead of a loading skeleton, while the data is refreshed in the background.
 */
const Dashboard: React.FC<{
  params: Promise<{ locale: Locale }>;
}> = async ({ params }) => {
  const { locale } = await params;
  const showPresence = environmentVariables.FEATURE_ENABLE_PRESENCE_TRACKING;

  return (
    <>
      <section className="container mx-auto mt-8 py-6">
        <article className="mx-auto w-full max-w-2xl space-y-6 px-4 sm:px-6 md:px-8">
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

          {/*
            Both sections are fed by the same batched tRPC request, so a
            failure without any cached content is shared and handled by a
            single error boundary.
          */}
          <DashboardContentErrorBoundary>
            {/* Landing page section: title, welcome content, action cards */}
            <DashboardLandingSection locale={locale}>
              {/* Welcome content blocks can only be rendered on the server */}
              <SafeErrorBoundary fallback={<></>}>
                <Suspense fallback={<></>}>
                  <DashboardWelcomeContent locale={locale} />
                </Suspense>
              </SafeErrorBoundary>
            </DashboardLandingSection>

            {/* Upcoming Program Elements Section */}
            <DashboardUpcomingEvents locale={locale} />
          </DashboardContentErrorBoundary>
        </article>
      </section>
    </>
  );
};

export default Dashboard;
