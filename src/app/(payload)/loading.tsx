import { ConveniatLogo } from '@/components/svg-logos/conveniat-logo';
import React from 'react';

const Loading: React.FC = () => {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center">
      <div className="animate-pulse">
        <ConveniatLogo className="h-32 w-32" />
      </div>
      <span className="mt-8 animate-pulse text-lg font-medium text-gray-500">Loading...</span>
    </div>
  );
};

export default Loading;
