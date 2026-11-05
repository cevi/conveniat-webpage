import { environmentVariables } from '@/config/environment-variables';
import { io } from 'next/cache';
import { notFound } from 'next/navigation';
import type React from 'react';
import { Suspense } from 'react';

/**
 * Lets the wristband page through only where the deployment enabled it. `io()` keeps the flag a
 * runtime decision, the way the material depot's layout does: prerendered at build time, where
 * the flag is unset, the route would be a 404 on every deployment.
 */
const WristbandsFeatureGate: React.FC<{ children: React.ReactNode }> = async ({ children }) => {
  await io();
  if (!environmentVariables.FEATURE_ENABLE_NFC_WRISTBANDS) notFound();
  return children;
};

const WristbandsLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-page min-h-dvh">
    <div className="mx-auto max-w-xl px-4 pt-4 pb-10">
      <Suspense>
        <WristbandsFeatureGate>{children}</WristbandsFeatureGate>
      </Suspense>
    </div>
  </div>
);

export default WristbandsLayout;
