'use client';

import { useOnboardingRecheck } from '@/features/onboarding/hooks/use-onboarding-recheck';
import type { Locale } from '@/types/types';
import type React from 'react';

/**
 * Runs the onboarding's start-up checks in the background of the app, see the hook. It sits in
 * the app shell around every page, so it takes the shell's locale: reading it from the route
 * params would keep every page from being prerendered.
 */
export const OnboardingRecheck: React.FC<{ locale: Locale }> = ({ locale }) => {
  useOnboardingRecheck(locale);
  return <></>;
};
