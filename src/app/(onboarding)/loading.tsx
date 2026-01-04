import { FancyLoadingScreen } from '@/features/onboarding/components/fancy-loading-screen';
import { OnboardingLayout } from '@/features/onboarding/components/onboarding-layout';
import React from 'react';

const Loading: React.FC = () => {
  // Matches the footer used in OnboardingProcess for consisteny
  const footer = <div className="invisible h-6">Spacer</div>;

  return (
    <div className="relative mx-auto flex h-screen max-w-96 flex-col items-center justify-center p-4">
      {/* Spacer to match the flex-grow behavior if necessary, or just rely on the center div */}
      <div className="flex w-full flex-grow items-center justify-center">
        <OnboardingLayout footer={footer}>
          <FancyLoadingScreen locale="de" />
        </OnboardingLayout>
      </div>

      {/* Visual placeholder for OnboardingProgress to prevent layout shift on hydration */}
      <div className="flex w-full justify-center gap-4 py-8 opacity-0">
        <div className="h-3 w-3"></div>
      </div>
    </div>
  );
};

export default Loading;
