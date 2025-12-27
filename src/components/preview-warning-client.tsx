'use client';

import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import React, { useState } from 'react';

interface Properties {
  locale: Locale;
  renderInPreviewMode: boolean;
}

export const PreviewWarningClient: React.FC<Properties> = ({ locale, renderInPreviewMode }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  const strings = {
    de: renderInPreviewMode ? 'DIES IST EINE VORSCHAU' : 'VORSCHAU DEAKTIVIERT',
    en: renderInPreviewMode ? 'THIS IS A PREVIEW' : 'PREVIEW DISABLED',
    fr: renderInPreviewMode ? 'CECI EST UNE PRÉVISUALISATION' : 'APERÇU DÉSACTIVÉ',
  };

  return (
    <div className="fixed right-0 bottom-0 z-50 p-4">
      <div
        className={cn(
          'cursor-pointer rounded-lg px-4 py-2 font-bold text-white shadow-lg transition-all duration-300 ease-in-out',
          renderInPreviewMode ? 'bg-orange-500' : 'bg-gray-500',
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
