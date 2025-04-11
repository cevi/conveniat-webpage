import React from 'react';

import {
  CeviLogoMarker,
  InitialMapPose,
  MapLibreRenderer,
} from '@/components/map-viewer/map-renderer';

export type InlineSwisstopoMapEmbedType = {
  blockName?: string;
  initialMapPose: InitialMapPose;
  ceviLogoMarkers: CeviLogoMarker[];
};

const InlineSwisstopoMapEmbed: React.FC<InlineSwisstopoMapEmbedType> = ({
  initialMapPose,
  ceviLogoMarkers,
}) => {
  return (
    <div className="h-[400px] w-full overflow-hidden rounded">
      <MapLibreRenderer
        initialMapPose={initialMapPose}
        ceviLogoMarkers={ceviLogoMarkers}
        validateStyle={process.env.NODE_ENV !== 'production'}
      />
    </div>
  );
};

export default InlineSwisstopoMapEmbed;
