import { environmentVariables } from '@/config/environment-variables';
import { io } from 'next/cache';
import { notFound } from 'next/navigation';
import type React from 'react';
import { Suspense } from 'react';

/**
 * Lets the story through only where the deployment enabled it. `io()` keeps the flag a runtime
 * decision, as for the material depot: prerendered at build time, where the flag is unset, the
 * route would be a 404 on every deployment. Who may read it is the router's answer.
 */
const StoryFeatureGate: React.FC<{ children: React.ReactNode }> = async ({ children }) => {
  await io();
  if (!environmentVariables.FEATURE_ENABLE_STORY) notFound();
  return children;
};

const StoryLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-page min-h-dvh">
    <div className="mx-auto max-w-xl px-4 pt-4 pb-10">
      <Suspense>
        <StoryFeatureGate>{children}</StoryFeatureGate>
      </Suspense>
    </div>
  </div>
);

export default StoryLayout;
