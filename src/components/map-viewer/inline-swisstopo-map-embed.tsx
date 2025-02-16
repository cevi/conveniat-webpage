import React from 'react';

import { MapLibreRenderer } from '@/components/map-viewer/map-renderer';

const InlineSwisstopoMapEmbed = (): React.JSX.Element => {
  return (
    <div className="h-[400px] w-full overflow-hidden rounded">
      <MapLibreRenderer
        initialMapPose={{
          centerLongitude: 8.303_628,
          centerLatitude: 46.502_992,
          zoom: 15.5,
        }}
        ceviLogoMarkers={[
          {
            geometry: { coordinates: [8.303_628, 46.502_992] },
            title: 'Cevi Logo',
            description: 'This is the Cevi Logo',
          },
          {
            geometry: { coordinates: [8.603_728, 46.502_892] },
            title: 'Cevi Logo',
            description: 'This is the Cevi Logo',
          },
        ]}
      />
    </div>
  );
};

export default InlineSwisstopoMapEmbed;
