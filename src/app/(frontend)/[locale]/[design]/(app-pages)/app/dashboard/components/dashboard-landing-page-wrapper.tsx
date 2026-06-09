import { DashboardAppFeatures } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-app-features';
import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import {
  getAppFeatureFlagsCached,
  getAppLandingPageCached,
} from '@/features/payload-cms/api/cached-globals';
import { PageSectionsConverter } from '@/features/payload-cms/converters/page-sections';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import type { Locale } from '@/types/types';
import { connection } from 'next/server';
import type React from 'react';

export const DashboardLandingPageWrapper: React.FC<{ locale: Locale }> = async ({ locale }) => {
  await connection();
  const [landing, featureFlags] = await Promise.all([
    getAppLandingPageCached(locale),
    getAppFeatureFlagsCached(),
  ]);

  return (
    <>
      <SetDynamicPageTitle newTitle={landing.title} />
      <HeadlineH1 className="mb-4">{landing.title}</HeadlineH1>
      {landing.pageContent && landing.pageContent.length > 0 && (
        <PageSectionsConverter locale={locale} blocks={landing.pageContent as ContentBlock[]} />
      )}
      {landing.showActionCards && (
        <DashboardAppFeatures locale={locale} featureFlags={featureFlags} />
      )}
    </>
  );
};
