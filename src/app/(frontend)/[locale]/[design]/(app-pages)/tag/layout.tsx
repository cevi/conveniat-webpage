import { environmentVariables } from '@/config/environment-variables';
import { io } from 'next/cache';
import { notFound } from 'next/navigation';
import type React from 'react';
import { Suspense } from 'react';

/**
 * Lets the page of a band through only where the deployment enabled the wristbands, decided at
 * runtime like the wristband pages' layout.
 */
const WristbandsFeatureGate: React.FC<{ children: React.ReactNode }> = async ({ children }) => {
  await io();
  if (!environmentVariables.FEATURE_ENABLE_NFC_WRISTBANDS) notFound();
  return children;
};

const TagLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-page min-h-app-content">
    <div className="mx-auto max-w-xl px-4 pt-4 pb-10">
      <Suspense>
        <WristbandsFeatureGate>{children}</WristbandsFeatureGate>
      </Suspense>
    </div>
  </div>
);

export default TagLayout;
