import { environmentVariables } from '@/config/environment-variables';
import type { InitialMapPose } from '@/features/map/components/map-renderer';
import { MapLibreRenderer } from '@/features/map/components/map-renderer';
import React from 'react';

const initialMapPoseObergoms: InitialMapPose = {
  initialMapCenter: [8.301_211, 46.502_822],
  zoom: 15.5,
};

export const MapComponent: React.FC = async () => {
  return (
    <div className="fixed top-[60px] left-0 h-[calc(100dvh-60px)] w-screen pb-20">
      <MapLibreRenderer
        initialMapPose={initialMapPoseObergoms}
        ceviLogoMarkers={[]}
        validateStyle={environmentVariables.NODE_ENV !== 'production'}
      />
    </div>
  );
};
