import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { environmentVariables } from '@/config/environment-variables';
import { labels } from '@/features/material/components/material-labels';
import { MaterialNav } from '@/features/material/components/material-nav';
import type { Locale } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import { io } from 'next/cache';
import { notFound } from 'next/navigation';
import type React from 'react';
import { Suspense } from 'react';

/**
 * Lets the depot through only where the deployment enabled it. `io()` keeps the flag a runtime
 * decision: prerendered at build time, where the flag is unset, the route would be a 404 on
 * every deployment. Not `connection()`, see app-features. It sits behind its own Suspense
 * boundary so the rest of the shell still prerenders.
 */
const MaterialFeatureGate: React.FC<{ children: React.ReactNode }> = async ({ children }) => {
  await io();
  if (!environmentVariables.FEATURE_ENABLE_MATERIAL_MANAGEMENT) notFound();
  return children;
};

const MaterialLayout: React.FC<{
  children: React.ReactNode;
  params: Promise<{ locale: Locale; design: DesignCodes }>;
}> = async ({ children, params }) => {
  const { locale, design } = await params;

  return (
    <div className="bg-page min-h-dvh">
      <div className="mx-auto max-w-6xl px-4">
        <SetDynamicPageTitle newTitle={labels.pageTitle[locale]} />
        <Suspense>
          <MaterialFeatureGate>
            <MaterialNav inAppDesign={design === DesignCodes.APP_DESIGN} />
            <div className="pt-4 pb-6">{children}</div>
          </MaterialFeatureGate>
        </Suspense>
      </div>
    </div>
  );
};

export default MaterialLayout;
