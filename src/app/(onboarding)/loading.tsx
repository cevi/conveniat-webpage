import { FancyLoadingScreen } from '@/features/onboarding/components/fancy-loading-screen';
import { OnboardingFrame } from '@/features/onboarding/components/onboarding-frame';
import React from 'react';

/** The same frame as the onboarding steps, with an empty bar, so nothing moves on hydration. */
const Loading: React.FC = () => (
  <OnboardingFrame>
    <FancyLoadingScreen locale="de" />
  </OnboardingFrame>
);

export default Loading;
