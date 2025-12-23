import { ConveniatLogo } from '@/components/svg-logos/conveniat-logo';
import React from 'react';

export const FancyLoadingScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative mb-8">
        <div className="relative z-10">
          <ConveniatLogo className="h-48 w-48 text-gray-800" />
        </div>

        {/* Spinning ring behind/around the logo for a "morphing" feel */}
        <div className="absolute top-1/2 left-1/2 -mt-[6rem] -ml-[6rem] h-48 w-48 animate-spin rounded-full border-t-4 border-b-4 border-gray-200 opacity-50 blur-sm"></div>
      </div>

      <div className="relative h-1.5 w-64 overflow-hidden rounded-full bg-gray-100">
        <div className="animate-loading absolute top-0 left-0 h-full w-1/2 rounded-full bg-gray-400"></div>
      </div>

      <h1 className="text-conveniat-green mt-8 font-['Montserrat'] text-2xl font-extrabold tracking-widest uppercase opacity-80">
        conveniat27
      </h1>
    </div>
  );
};
