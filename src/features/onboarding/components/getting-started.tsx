import React from 'react';
import { CenteredConveniatLogo } from '@/features/onboarding/components/centered-conveniat-logo';

export const GettingReadyEntrypointComponent: React.FC = () => {
  return (
    <div className="rounded-lg p-8 text-center">
      <CenteredConveniatLogo />
      <p className="mb-4 text-balance text-gray-700">Getting the application ready for you.</p>
    </div>
  );
};
