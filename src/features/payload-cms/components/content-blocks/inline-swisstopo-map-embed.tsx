import type React from 'react';

import { MapLibreRenderer } from '@/components/map/map-renderer-wrapper';
import type { CeviLogoMarker, InitialMapPose } from '@/components/map/types';
import { environmentVariables } from '@/config/environment-variables';

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
    <div className="h-[400px] w-full overflow-hidden rounded-sm">
      <MapLibreRenderer
        initialMapPose={initialMapPose}
        ceviLogoMarkers={ceviLogoMarkers}
        validateStyle={environmentVariables.NODE_ENV !== 'production'}
      />
    </div>
  );
};

export default InlineSwisstopoMapEmbed;
