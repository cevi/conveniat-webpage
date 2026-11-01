import { DashboardContentErrorBoundary } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-content-error-boundary';
import { DashboardGreeting } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-greeting';
import { DashboardLanding } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-landing-section';
import { DashboardNow } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-now';
import { RefreshRouteOnSave } from '@/components/utils/refresh-preview';
import { environmentVariables } from '@/config/environment-variables';
import {
  getAppFeatureFlagsCached,
  getAppLandingPageCached,
} from '@/features/payload-cms/api/cached-globals';
import { PageSectionsConverter } from '@/features/payload-cms/converters/page-sections';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import { resolvePreviewAccess } from '@/features/payload-cms/utils/preview/preview-utils';
import type { Locale, SearchParameters } from '@/types/types';
import { forceDynamicOnBuild } from '@/utils/is-pre-rendering';
import { notFound } from 'next/navigation';
import type React from 'react';

/** Everything here depends on the editor's session and the draft, so nothing can be prerendered. */
export const instant = false;

/**
 * The live preview of the App Landing Page global: Home as the app shows it, with the draft's
 * title, welcome content and Schnellzugriff. Everything else on Home, the greeting and "Jetzt",
 * is the editor's own, as on the real dashboard. The proxy renders this route in the app's design.
 */
const DashboardPreview: React.FC<{
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<SearchParameters>;
}> = async ({ params, searchParams }) => {
  if (await forceDynamicOnBuild()) return <></>;

  // The app route group is served to anonymous visitors and this page reads the draft, so it
  // needs an editor session. A shared preview token opens one document, never this global.
  const searchParameters = await searchParams;
  if (searchParameters['preview'] !== 'true') notFound();
  const { renderInPreviewMode, previewDocumentId } = await resolvePreviewAccess(searchParameters);
  if (!renderInPreviewMode || previewDocumentId !== undefined) notFound();

  const { locale } = await params;
  const [landingPage, featureFlags] = await Promise.all([
    getAppLandingPageCached(locale, true),
    getAppFeatureFlagsCached(),
  ]);

  const pageContent = (landingPage.pageContent ?? []) as ContentBlock[];

  return (
    <article className="mx-auto w-full max-w-2xl space-y-6 px-4 py-5 sm:px-6 md:px-8">
      <RefreshRouteOnSave serverURL={environmentVariables.APP_HOST_URL} />
      <DashboardGreeting locale={locale} />

      <DashboardContentErrorBoundary>
        <DashboardLanding
          locale={locale}
          title={landingPage.title}
          showActionCards={landingPage.showActionCards ?? false}
          flags={{
            imageUploadEnabled: featureFlags.imageUploadEnabled !== false,
            materialEnabled: environmentVariables.FEATURE_ENABLE_MATERIAL_MANAGEMENT,
          }}
          supportEmail={environmentVariables.APP_SUPPORT_EMAIL}
        >
          {pageContent.length > 0 && (
            <PageSectionsConverter locale={locale} blocks={pageContent} renderInPreviewMode />
          )}
          <DashboardNow locale={locale} />
        </DashboardLanding>
      </DashboardContentErrorBoundary>
    </article>
  );
};

export default DashboardPreview;
