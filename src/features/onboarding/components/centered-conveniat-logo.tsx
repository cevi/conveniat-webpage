import { ConveniatLogo } from '@/components/svg-logos/conveniat-logo';
import React from 'react';

export const CenteredConveniatLogo: React.FC = () => {
  return (
    <div>
      <ConveniatLogo className="mx-auto mb-3 mt-6 h-36 w-36" />

      <h1 className="mb-16 font-['Montserrat'] text-2xl font-extrabold text-conveniat-green">
        conveniat27
      </h1>
    </div>
  );
};
