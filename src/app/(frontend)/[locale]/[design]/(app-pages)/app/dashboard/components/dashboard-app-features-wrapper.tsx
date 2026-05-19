import { DashboardAppFeatures } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-app-features';
import { getAppFeatureFlagsCached } from '@/features/payload-cms/api/cached-globals';
import type { Locale } from '@/types/types';
import type React from 'react';

export const DashboardAppFeaturesWrapper: React.FC<{ locale: Locale }> = async ({ locale }) => {
  const featureFlags = await getAppFeatureFlagsCached();

  return <DashboardAppFeatures locale={locale} featureFlags={featureFlags} />;
};
