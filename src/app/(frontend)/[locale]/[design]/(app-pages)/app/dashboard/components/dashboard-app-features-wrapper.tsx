import { DashboardAppFeatures } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-app-features';
import { getAppFeatureFlagsCached } from '@/features/payload-cms/api/cached-globals';
import type { Locale } from '@/types/types';
import { connection } from 'next/server';
import type React from 'react';

export const DashboardAppFeaturesWrapper: React.FC<{ locale: Locale }> = async ({ locale }) => {
  await connection();
  const featureFlags = await getAppFeatureFlagsCached();

  return <DashboardAppFeatures locale={locale} featureFlags={featureFlags} />;
};
