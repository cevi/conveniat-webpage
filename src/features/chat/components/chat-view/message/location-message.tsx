import { SafeErrorBoundary } from '@/components/error-boundary/safe-error-boundary';
import type { ChatMessage } from '@/features/chat/api/types';
// eslint-disable-next-line import/no-restricted-paths
import { MapLibreRenderer } from '@/features/map/components/map-renderer-wrapper';
// eslint-disable-next-line import/no-restricted-paths
import { MapUnavailableFallback } from '@/features/map/components/map-unavailable-fallback';
import type { StaticTranslationString } from '@/types/types';
import { i18nConfig, type Locale } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

const locationText: StaticTranslationString = {
  de: 'Standort',
  fr: 'Emplacement',
  en: 'Location',
};

const openInMapsText: StaticTranslationString = {
  de: 'In Karten-App öffnen',
  en: 'Open in maps app',
  fr: "Ouvrir dans l'application de cartes",
};

/**
 * Shown instead of the interactive map when it cannot be rendered (e.g. the browser
 * provides no WebGL context). The raw coordinates stay visible because a location
 * message may carry safety-critical information, for example in an emergency chat.
 *
 * @param latitude
 * @param longitude
 * @constructor
 */
const LocationFallback: React.FC<{ latitude: number; longitude: number }> = ({
  latitude,
  longitude,
}) => {
  const locale = (useCurrentLocale(i18nConfig) as Locale | undefined) ?? 'de';

  return (
    <MapUnavailableFallback>
      <p className="font-mono text-sm text-gray-800">
        {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </p>
      <a
        className="text-conveniat-green text-sm font-semibold underline"
        href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {openInMapsText[locale]}
      </a>
    </MapUnavailableFallback>
  );
};

/**
 * Renders a location message in the chat.
 *
 * @param message
 * @constructor
 */
export const LocationMessage: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const payload = message.messagePayload as unknown as {
    location?: { latitude: number; longitude: number };
    latitude?: number;
    longitude?: number;
  };
  const location = payload.location ?? payload;

  const latitude = location.latitude;
  const longitude = location.longitude;

  if (latitude === undefined || longitude === undefined) return <></>;

  const initialMapPose = {
    initialMapCenter: [longitude, latitude] as [number, number],
    zoom: 15,
  };

  const marker = {
    geometry: {
      coordinates: [longitude, latitude] as [number, number],
    },
    title: locationText[locale],
  };

  const fallback = <LocationFallback latitude={latitude} longitude={longitude} />;

  return (
    <div className="flex items-center justify-center p-4 text-gray-500">
      <div className="h-[400px] w-full overflow-hidden rounded-sm">
        {/* A failing map must never take down the surrounding chat. */}
        <SafeErrorBoundary fallback={fallback}>
          <MapLibreRenderer
            initialMapPose={initialMapPose}
            ceviLogoMarkers={[marker]}
            schedules={{}}
            unavailableFallback={fallback}
          />
        </SafeErrorBoundary>
      </div>
    </div>
  );
};
