'use client';

import { useOnboardingRecheck } from '@/features/onboarding/hooks/use-onboarding-recheck';
import type React from 'react';

/** Runs the onboarding's start-up checks in the background of the app, see the hook. */
export const OnboardingRecheck: React.FC = () => {
  useOnboardingRecheck();
  return <></>;
};
