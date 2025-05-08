import type React from 'react';

import { environmentVariables } from '@/config/environment-variables';
import type { CeviLogoMarker, InitialMapPose } from '@/features/map/components/map-renderer';
import { MapLibreRenderer } from '@/features/map/components/map-renderer';

export interface InlineSwisstopoMapEmbedType {
  blockName?: string;
  initialMapPose: InitialMapPose;
  ceviLogoMarkers: CeviLogoMarker[];
}

const InlineSwisstopoMapEmbed: React.FC<InlineSwisstopoMapEmbedType> = ({
  initialMapPose,
  ceviLogoMarkers,
}) => {
  return (
    <div className="h-[400px] w-full overflow-hidden rounded">
      <MapLibreRenderer
        initialMapPose={initialMapPose}
        ceviLogoMarkers={ceviLogoMarkers}
        validateStyle={environmentVariables.NODE_ENV !== 'production'}
      />
    </div>
  );
};

export default InlineSwisstopoMapEmbed;
