import { MapLibreRenderer } from '@/features/map/components/map-renderer-wrapper';
import { Maximize2, Minimize2 } from 'lucide-react';
import React from 'react';

interface LocationMapProperties {
  latitude: number;
  longitude: number;
  title?: string;
  isMaximized: boolean;
  onToggleMaximize: (maximized: boolean) => void;
  locale?: string;
}

export const LocationMap: React.FC<LocationMapProperties> = ({
  latitude,
  longitude,
  title = 'User Location',
  isMaximized,
  onToggleMaximize,
  locale = 'en',
}) => {
  if (isMaximized) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col bg-[var(--theme-bg)]">
        <div className="flex items-center justify-between border-b border-[var(--theme-elevation-150)] bg-[var(--theme-elevation-50)] p-4">
          <h2 className="text-lg font-bold">
            {title} - {locale === 'de' ? 'Standort' : 'Location'}
          </h2>
          <button
            onClick={() => onToggleMaximize(false)}
            className="rounded border border-gray-200 bg-white p-2 text-gray-700 shadow-md transition-colors hover:bg-gray-100"
            title={locale === 'de' ? 'Verkleinern' : 'Minimize'}
          >
            <Minimize2 size={20} />
          </button>
        </div>
        <div className="flex-1">
          <MapLibreRenderer
            initialMapPose={{
              initialMapCenter: [longitude, latitude],
              zoom: 16,
            }}
            ceviLogoMarkers={[
              {
                geometry: { coordinates: [longitude, latitude] },
                title: 'User Location',
              },
            ]}
            schedules={{}}
            limitUsage={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-48 w-full shrink-0 overflow-hidden rounded-lg border border-[var(--theme-elevation-200)] shadow-sm">
      <MapLibreRenderer
        initialMapPose={{
          initialMapCenter: [longitude, latitude],
          zoom: 14,
        }}
        ceviLogoMarkers={[
          {
            geometry: { coordinates: [longitude, latitude] },
            title: 'User Location',
          },
        ]}
        schedules={{}}
        limitUsage={false}
      />
      <div className="absolute top-2 left-2 flex flex-col gap-2">
        <button
          onClick={() => onToggleMaximize(true)}
          className="rounded border border-gray-200 bg-white p-2 text-gray-700 shadow-md transition-colors hover:bg-gray-100"
          title={locale === 'de' ? 'Vergrössern' : 'Maximize'}
        >
          <Maximize2 size={16} />
        </button>
      </div>
      <div className="absolute top-2 right-2 rounded border border-[var(--theme-elevation-200)] bg-[var(--theme-elevation-50)] px-2 py-1 text-[10px] shadow">
        {title}
      </div>
    </div>
  );
};
