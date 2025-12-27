import { ConveniatLogo } from '@/components/svg-logos/conveniat-logo';
import React from 'react';

export const CenteredConveniatLogo: React.FC = () => {
  return (
    <div>
      <ConveniatLogo className="mx-auto mt-6 mb-3 h-36 w-36" />

      <h1 className="text-conveniat-green mb-8 font-['Montserrat'] text-2xl font-extrabold">
        conveniat27
      </h1>
    </div>
  );
};
