import type { ChatMessage } from '@/features/chat/api/types';
// eslint-disable-next-line import/no-restricted-paths
import { MapLibreRenderer } from '@/features/map/components/map-renderer-wrapper';
import type { StaticTranslationString } from '@/types/types';
import { i18nConfig, type Locale } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

/**
 * Renders a location message in the chat.
 *
 * @param content
 * @constructor
 */
export const LocationMessage: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { latitude, longitude } = (
    message.messagePayload as { location: { latitude: number; longitude: number } }
  ).location;

  const initialMapPose = {
    initialMapCenter: [longitude, latitude] as [number, number],
    zoom: 15,
  };

  const locationText: StaticTranslationString = {
    de: 'Standort',
    fr: 'Emplacement',
    en: 'Location',
  };

  const marker = {
    geometry: {
      coordinates: [longitude, latitude] as [number, number],
    },
    title: locationText[locale],
  };

  return (
    <div className="flex items-center justify-center p-4 text-gray-500">
      <div className="h-[400px] w-full overflow-hidden rounded-sm">
        <MapLibreRenderer
          initialMapPose={initialMapPose}
          ceviLogoMarkers={[marker]}
          schedules={{}}
        />
      </div>
    </div>
  );
};
