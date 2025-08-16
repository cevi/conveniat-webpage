'use client';

import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import React, { useState } from 'react';

interface Properties {
  locale: Locale;
}

export const PreviewWarningClient: React.FC<Properties> = ({ locale }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  const strings = {
    de: 'DIES IST EINE VORSCHAU',
    en: 'THIS IS A PREVIEW',
    fr: 'CECI EST UNE PRÉVISUALISATION',
  };

  return (
    <div className="fixed right-0 bottom-0 z-50 p-4">
      <div
        className={cn(
          'cursor-pointer rounded-lg bg-orange-500 px-4 py-2 font-bold text-white shadow-lg transition-all duration-300 ease-in-out',
          {
            'scale-50 opacity-70': isMinimized,
            'scale-100': !isMinimized,
          },
        )}
        onClick={() => setIsMinimized((previous) => !previous)}
        title="Click to toggle size"
      >
        {strings[locale]}
      </div>
    </div>
  );
};
