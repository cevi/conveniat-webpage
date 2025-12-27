import { CenteredConveniatLogo } from '@/features/onboarding/components/centered-conveniat-logo';
import React from 'react';

interface OnboardingLayoutProperties {
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const OnboardingLayout: React.FC<OnboardingLayoutProperties> = ({ children, footer }) => {
  return (
    <div className="flex w-full max-w-sm flex-col items-center">
      {/* Card Section */}
      <div className="flex min-h-[300px] w-full flex-col items-center justify-center rounded-2xl bg-white p-8 text-center shadow-lg">
        <CenteredConveniatLogo />
        {children}
      </div>

      {/* Footer Section (Skip Button) - Outside Card */}
      {footer && <div className="mt-6">{footer}</div>}
    </div>
  );
};
