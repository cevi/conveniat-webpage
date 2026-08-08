'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { MapPinOff } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

const mapUnavailableText: StaticTranslationString = {
  de: 'Die Karte kann auf diesem Gerät nicht angezeigt werden.',
  en: 'The map cannot be displayed on this device.',
  fr: 'La carte ne peut pas être affichée sur cet appareil.',
};

/**
 * Rendered in place of the map whenever MapLibre cannot be initialized,
 * most commonly because the browser provides no WebGL context.
 *
 * @param children optional additional content, e.g. the raw coordinates of a location
 * @constructor
 */
export const MapUnavailableFallback: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const locale = (useCurrentLocale(i18nConfig) as Locale | undefined) ?? 'de';

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gray-100 p-4 text-center">
      <MapPinOff className="h-8 w-8 text-gray-400" />
      <p className="text-sm text-gray-500">{mapUnavailableText[locale]}</p>
      {children}
    </div>
  );
};
