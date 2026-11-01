'use client';

import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { MapPinOff } from 'lucide-react';
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
    <div className="bg-quiet flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
      <MapPinOff className="h-8 w-8 text-green-500" aria-hidden="true" />
      <p className="text-[13px] text-balance text-green-700">{mapUnavailableText[locale]}</p>
      {children}
    </div>
  );
};
