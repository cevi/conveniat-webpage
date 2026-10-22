import { DashboardContentErrorBoundary } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-content-error-boundary';
import { DashboardGreeting } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-greeting';
import { DashboardLandingSection } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-landing-section';
import { DashboardNow } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-now';
import { DashboardWelcomeContent } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-welcome-content';
import { SafeErrorBoundary } from '@/components/error-boundary/safe-error-boundary';
import { environmentVariables } from '@/config/environment-variables';
import type { Locale } from '@/types/types';
import type React from 'react';
import { Suspense } from 'react';

/**
 * Home: the greeting, what runs now and the Schnellzugriff.
 *
 * The content is rendered by client components backed by the persisted react-query cache (see
 * `DashboardLandingSection` and `DashboardNow`). This keeps the page shell static, so navigating
 * back to the dashboard renders the previously loaded content immediately instead of a loading
 * skeleton, while the data is refreshed in the background.
 */
const Dashboard: React.FC<{
  params: Promise<{ locale: Locale }>;
}> = async ({ params }) => {
  const { locale } = await params;

  return (
    <article className="mx-auto w-full max-w-2xl space-y-6 px-4 py-5 sm:px-6 md:px-8">
      <DashboardGreeting locale={locale} />

      {/*
        Both sections are fed by the same batched tRPC request, so a
        failure without any cached content is shared and handled by a
        single error boundary.
      */}
      <DashboardContentErrorBoundary>
        <DashboardLandingSection
          locale={locale}
          materialEnabled={environmentVariables.FEATURE_ENABLE_MATERIAL_MANAGEMENT}
          supportEmail={environmentVariables.APP_SUPPORT_EMAIL}
        >
          {/* Welcome content blocks can only be rendered on the server */}
          <SafeErrorBoundary fallback={<></>}>
            <Suspense fallback={<></>}>
              <DashboardWelcomeContent locale={locale} />
            </Suspense>
          </SafeErrorBoundary>

          <DashboardNow locale={locale} />
        </DashboardLandingSection>
      </DashboardContentErrorBoundary>
    </article>
  );
};

export default Dashboard;
